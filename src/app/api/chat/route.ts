import { NextRequest, NextResponse } from "next/server";

const MISO_API_URL = "https://api.holdings.miso.gs/ext/v1/chat";

const ERROR_MESSAGES: Record<string, string> = {
  conversation_does_not_exists: "요청한 대화를 찾을 수 없습니다.",
  invalid_param: "잘못된 파라미터가 입력되었습니다.",
  app_unavailable: "앱 설정 정보를 사용할 수 없습니다.",
  provider_not_initialize: "사용할 수 있는 모델 인증 정보가 설정되어 있지 않습니다.",
  provider_quota_exceeded: "모델 호출 가능 쿼터가 부족합니다.",
  model_currently_not_support: "현재 모델을 사용할 수 없습니다.",
  completion_request_error: "텍스트 생성 요청에 실패하였습니다.",
  internal_server_error: "내부 서버 오류가 발생하였습니다.",
};

function getErrorMessage(status: number, code?: string): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  if (status === 404) return ERROR_MESSAGES.conversation_does_not_exists;
  if (status === 500) return ERROR_MESSAGES.internal_server_error;
  return `오류가 발생하였습니다. (${status})`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MISO_API_KEY;

  if (!apiKey || apiKey === "your_miso_api_key_here") {
    return NextResponse.json(
      { error: "MISO_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const requestBody = {
      inputs: {},
      query: body.query,
      mode: "streaming",
      conversation_id: body.conversation_id || "",
      user: body.user || "anonymous",
    };

    const misoResponse = await fetch(MISO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!misoResponse.ok) {
      let errorCode: string | undefined;
      let errorDetail: string | undefined;
      try {
        const errorData = await misoResponse.json();
        errorCode = errorData.code;
        errorDetail = errorData.message;
        console.error("[API /chat] MISO error:", {
          status: misoResponse.status,
          code: errorCode,
          message: errorDetail,
          requestBody,
        });
      } catch {
        console.error("[API /chat] MISO error (non-JSON):", misoResponse.status);
      }

      return NextResponse.json(
        {
          error: getErrorMessage(misoResponse.status, errorCode),
          detail: errorDetail,
          code: errorCode,
        },
        { status: misoResponse.status }
      );
    }

    // Pass-through the SSE stream
    const stream = misoResponse.body;
    if (!stream) {
      return NextResponse.json(
        { error: "응답 스트림을 읽을 수 없습니다." },
        { status: 500 }
      );
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API /chat] Error:", error);
    return NextResponse.json(
      { error: "내부 서버 오류가 발생하였습니다." },
      { status: 500 }
    );
  }
}
