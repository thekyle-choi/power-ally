# MISO 챗 워크플로우 API 명세

## 엔드포인트
`POST https://api.holdings.miso.gs/ext/v1/chat`

## 입력 변수 (Input Variables)
- 입력 변수가 정의되지 않았습니다.

## 출력 변수 (Output Variables)
- **answer** (string): 모델의 응답 텍스트
- **agent_thoughts** (array): 에이전트 추론 로그 (옵션)

## 요청 형식 (Request Format)
```json
{
  "url": "https://api.holdings.miso.gs/ext/v1/chat",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {API_KEY}",
    "Content-Type": "application/json"
  },
  "body": {
    "inputs": {},
    "query": "질문 또는 사용자 입력",
    "mode": "blocking or streaming",
    "conversation_id": "",
    "user": "abc-123"
  }
}
```

## 응답 형식 (Response Format)
```json
{
  "id": "message_id",
  "conversation_id": "conversation_id",
  "answer": "모델의 응답 텍스트",
  "agent_thoughts": [],
  "created_at": "2026-02-12T08:37:40.440Z"
}
```

## 사용 예시 (cURL)
```bash
curl -X POST 'https://api.holdings.miso.gs/ext/v1/chat' \
  -H 'Authorization: Bearer {MISO_API_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
  "inputs": {},
  "query": "질문 또는 사용자 입력",
  "mode": "blocking or streaming",
  "conversation_id": "",
  "user": "abc-123"
}'
```

## 참고사항
### 채팅 메세지 보내기

**POST** /chat

```bash
curl -X POST 'https://<your-endpoint>/ext/v1/chat' \
--header 'Authorization: Bearer {api_key}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "What are the specs of the iPhone 13 Pro Max?",
    "mode": "streaming",
    "conversation_id": "",
    "user": "abc-123",
    "files": [
      {
        "type": "image",
        "transfer_method": "remote_url",
        "url": "https://ko.wikipedia.org/static/images/icons/wikipedia.png"
      }
    ]
}'
```



**Request Body**

* `query` (string)
  * 사용자의 입력 또는 질문 내용
* `inputs` (object)
  * 앱에서 정의된 변수들의 값을 입력
  * 여러 개의 key/value 쌍으로 구성되며, 각 key는 변수명, value는 해당 값
  * 기본값은 `{}`
* `mode` (string)
  * 응답 반환 방식
    * `streaming`: 스트리밍 모드 (권장)\
      Server-Sent Events(SSE)를 통해 타자기처럼 출력됩니다.
    * `blocking`: 블로킹 모드\
      실행 완료 후 결과를 한 번에 반환
* `user` (string)
  * 최종 사용자 식별자
  * 통계 및 조회용으로 사용되며, 앱 내에서 고유하게 정의되어야 합니다.
* `conversation_id` (string)
  * 이전 대화 내용을 기반으로 이어서 대화를 진행하려면 이전 메시지의 `conversation_id`를 전달해야 합니다.
* `files` (array\[object])
  * 이미지 등 파일을 함께 입력할 때 사용합니다.
  * 모델이 Vision 기능을 지원할 경우에만 사용 가능합니다.
  * 파일 객체 구성:
    * `type` (string): 지원 타입 (`image`만 지원)
    * `transfer_method` (string): 전달 방식
      * `remote_url`: 이미지 URL
      * `local_file`: 파일 업로드 방식
    * `url` (string): 이미지 URL (`transfer_method`가 `remote_url`일 때 사용)
    * `upload_file_id` (string): 업로드된 파일 ID (`local_file` 방식일 경우, 사전에 업로드된 ID가 필요합니다.)
*   `auto_gen_name` (bool)

    * 대화 제목 자동 생성 여부 (기본값: `true`)
    * `false`로 설정하면, 대화 제목을 비동기적으로 생성할 수 있으며\
      이 경우 **대화 이름 변경 API**를 호출하고 `auto_generate`를 `true`로 설정하면 됩니다.



#### Errors
채팅 메시지 전송 시 발생할 수 있는 오류 목록입니다.
* 404, Conversation does not exists
  * 요청한 대화(conversation)를 찾을 수 없습니다.
* 400, invalid\_param
  * 잘못된 파라미터가 입력되었습니다.
  * Workflow not published: 앱이 발행되지 않았음. 미소 앱 편집화면에서 저장버튼을 눌러주세요.
* 400, app\_unavailable
  * 앱(App) 설정 정보를 사용할 수 없습니다.
* 400, provider\_not\_initialize
  * 사용할 수 있는 모델 인증 정보가 설정되어 있지 않습니다.
* 400, provider\_quota\_exceeded
  * 모델 호출 가능 쿼터가 부족합니다.
* 400, model\_currently\_not\_support
  * 현재 모델을 사용할 수 없습니다.
* 400, completion\_request\_error
  * 텍스트 생성 요청에 실패하였습니다.
* 500, internal\_server\_error
  * 내부 서버 오류가 발생하였습니다.


# 클라이언트 구현 예시 (next.js)

```typescript
const processStreamingResponse = async (message: string, messageId: string) => {
  // SSE 연결 설정
  const response = await fetch("/api/chat", {
  method: "POST",
  headers: {
  "Authorization": "Bearer {API_KEY}",
  "Content-Type": "application/json"
},
  body: JSON.stringify({
  "inputs": {},
  "query": "질문 또는 사용자 입력",
  "mode": "streaming",
  "conversation_id": "",
  "user": "abc-123"
})
})

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let currentContent = ""

  // 스트리밍 처리
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })

    // 이벤트 데이터 처리
    const lines = chunk.split("\n")
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          const jsonStr = line.slice(5).trim()
          if (jsonStr === "[DONE]") continue

          const data = JSON.parse(jsonStr)
          // 이벤트 타입에 따른 처리
          // - agent_message: 메시지 내용 추가
          // - agent_thought: 에이전트 생각 과정
          // - message_replace: 전체 메시지 대체
        } catch (e) {
          console.error("JSON 파싱 오류:", e)
        }
      }
    }
  }
}
```

# 개발 가이드라인
* API 호출이 실패하면 응답의 detail message와 해결방안을 한글로 화면에 표시해줘.
* 환경변수로 MISO_API_KEY를 입력받을 수 있게 하라.