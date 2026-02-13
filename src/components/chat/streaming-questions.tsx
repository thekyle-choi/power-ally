"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";
import type { Question } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface StreamingQuestionsProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  isStreaming?: boolean;
  isActive?: boolean;
  animateEntrance?: boolean;
  className?: string;
}

type AnswerValue = string | string[];

const buildInitialAnswers = (questions: Question[]) => {
  const initialAnswers: Record<number, AnswerValue> = {};
  questions.forEach((question, index) => {
    if (question.preselected && question.type === "multiselect" && question.options) {
      initialAnswers[index] = question.options.map((opt) => opt.label);
    }
  });
  return initialAnswers;
};

// ============================================================================
// OptionItem Component
// ============================================================================

interface OptionItemProps {
  label: string;
  description?: string;
  isSelected: boolean;
  isMultiSelect: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const OptionItem = memo(({
  label,
  description,
  isSelected,
  isMultiSelect,
  onClick,
  disabled = false,
}: OptionItemProps) => (
  <label
    onClick={disabled ? undefined : (e) => { e.preventDefault(); onClick(); }}
    className={cn(
      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-white cursor-pointer transition-all border-2",
      isSelected
        ? "border-text-primary"
        : "border-transparent hover:border-divider",
      disabled && "cursor-default opacity-60"
    )}
  >
    <input
      type={isMultiSelect ? "checkbox" : "radio"}
      checked={isSelected}
      readOnly
      className="w-4 h-4 shrink-0 pointer-events-none"
      style={{ accentColor: "#242424" }}
    />
    <div className="flex flex-col">
      <span className="font-ui text-[14px] text-text-primary">{label}</span>
      {description && (
        <span className="font-ui text-xs text-text-secondary mt-0.5">{description}</span>
      )}
    </div>
  </label>
));

OptionItem.displayName = "OptionItem";

// ============================================================================
// OtherOptionItem Component
// ============================================================================

interface OtherOptionItemProps {
  isSelected: boolean;
  isMultiSelect: boolean;
  customValue: string;
  onSelect: () => void;
  onCustomChange: (value: string) => void;
  disabled?: boolean;
}

const OtherOptionItem = memo(({
  isSelected,
  isMultiSelect,
  customValue,
  onSelect,
  onCustomChange,
  disabled = false,
}: OtherOptionItemProps) => (
  <label
    onClick={disabled ? undefined : (e) => { e.preventDefault(); onSelect(); }}
    className={cn(
      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-white cursor-pointer transition-all border-2",
      isSelected
        ? "border-text-primary"
        : "border-transparent hover:border-divider",
      disabled && "cursor-default opacity-60"
    )}
  >
    <input
      type={isMultiSelect ? "checkbox" : "radio"}
      checked={isSelected}
      readOnly
      className="w-4 h-4 shrink-0 pointer-events-none"
      style={{ accentColor: "#242424" }}
    />
    <Input
      placeholder="기타 (직접 입력)"
      value={customValue}
      onChange={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onCustomChange(e.target.value);
        if (!isSelected) onSelect();
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 font-ui border-divider focus:border-text-primary focus:ring-text-primary"
      disabled={disabled}
    />
  </label>
));

OtherOptionItem.displayName = "OtherOptionItem";

// ============================================================================
// QuestionStep Component
// ============================================================================

interface QuestionStepProps {
  question: Question;
  questionIndex: number;
  value: AnswerValue;
  customValue: string;
  error?: string;
  onSelect: (value: string) => void;
  onMultiSelect: (value: string, checked: boolean) => void;
  onCustomChange: (value: string) => void;
  disabled?: boolean;
  animateEntrance?: boolean;
}

const QuestionStep = memo(({
  question,
  questionIndex,
  value,
  customValue,
  error,
  onSelect,
  onMultiSelect,
  onCustomChange,
  disabled = false,
  animateEntrance = false,
}: QuestionStepProps) => {
  const isMultiSelect = question.type === "multiselect";
  const selectedValues = Array.isArray(value) ? value : [];
  const selectedValue = typeof value === "string" ? value : "";
  const isOtherSelected = selectedValues.includes("__other__") || selectedValue === "__other__";

  const handleOptionClick = (optionLabel: string) => {
    if (disabled) return;
    if (isMultiSelect) {
      const isCurrentlySelected = selectedValues.includes(optionLabel);
      onMultiSelect(optionLabel, !isCurrentlySelected);
    } else {
      onSelect(optionLabel);
    }
  };

  const handleOtherClick = () => {
    if (disabled) return;
    if (isMultiSelect) {
      onMultiSelect("__other__", !isOtherSelected);
    } else {
      onSelect("__other__");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {question.options && (
        <div className="space-y-1.5 font-ui">
          {question.options.map((option, idx) => (
            <motion.div
              key={option.label}
              initial={animateEntrance ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={animateEntrance ? { duration: 0.3, delay: idx * 0.1, ease: "easeOut" } : { duration: 0 }}
            >
              <OptionItem
                label={option.label}
                description={option.description}
                isSelected={
                  isMultiSelect
                    ? selectedValues.includes(option.label)
                    : selectedValue === option.label
                }
                isMultiSelect={isMultiSelect}
                onClick={() => handleOptionClick(option.label)}
                disabled={disabled}
              />
            </motion.div>
          ))}
          <motion.div
            initial={animateEntrance ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={animateEntrance ? { duration: 0.3, delay: question.options.length * 0.1, ease: "easeOut" } : { duration: 0 }}
          >
            <OtherOptionItem
              isSelected={isOtherSelected}
              isMultiSelect={isMultiSelect}
              customValue={customValue}
              onSelect={handleOtherClick}
              onCustomChange={onCustomChange}
              disabled={disabled}
            />
          </motion.div>
          {error && (
            <p className="text-sm text-red-600 mt-2 pl-1">{error}</p>
          )}
        </div>
      )}
    </motion.div>
  );
});

QuestionStep.displayName = "QuestionStep";

// ============================================================================
// PaginationDots Component
// ============================================================================

interface PaginationDotsProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}

const PaginationDots = memo(({ total, current, onDotClick }: PaginationDotsProps) => {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => {
        const isCurrentDot = index === current;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onDotClick(index)}
            className="flex cursor-pointer items-center justify-center"
            aria-label={`Go to question ${index + 1} of ${total}`}
            aria-current={isCurrentDot ? "step" : undefined}
          >
            <div
              className={cn(
                "rounded-full transition-all",
                isCurrentDot
                  ? "h-2 w-5 bg-text-primary"
                  : "size-2 bg-text-secondary/30 hover:bg-text-secondary/60"
              )}
            />
          </button>
        );
      })}
    </div>
  );
});

PaginationDots.displayName = "PaginationDots";

// ============================================================================
// StreamingQuestions Component
// ============================================================================

export const StreamingQuestions = memo(({
  questions,
  onSubmit,
  isStreaming = false,
  isActive = true,
  animateEntrance = false,
  className,
}: StreamingQuestionsProps) => {
  const [readyQuestions, setReadyQuestions] = useState<Question[]>([]);
  const wasStreamingRef = useRef(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
      if (!isInitializedRef.current || readyQuestions.length > 0) {
        setReadyQuestions([]);
        setCurrentStep(0);
        setAnswers({});
        setCustomValues({});
        setIsSubmitted(false);
        setErrors({});
        isInitializedRef.current = false;
      }
    } else if (!isStreaming && wasStreamingRef.current && questions.length > 0) {
      wasStreamingRef.current = false;
      setReadyQuestions(questions);
      setCurrentStep(0);
      setAnswers(buildInitialAnswers(questions));
      setCustomValues({});
      setIsSubmitted(false);
      setErrors({});
      isInitializedRef.current = true;
    } else if (!isStreaming && !isInitializedRef.current && questions.length > 0) {
      setReadyQuestions(questions);
      setCurrentStep(0);
      setAnswers(buildInitialAnswers(questions));
      setCustomValues({});
      setIsSubmitted(false);
      setErrors({});
      isInitializedRef.current = true;
    }
  }, [isStreaming, questions.length]);

  useEffect(() => {
    if (!isStreaming && readyQuestions.length > 0) {
      setCurrentStep((prev) => Math.min(prev, readyQuestions.length - 1));
    }
  }, [readyQuestions.length, isStreaming]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [customValues, setCustomValues] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === readyQuestions.length - 1;
  const isReady = !isStreaming && readyQuestions.length > 0;

  const getRequiredError = (
    question: Question,
    answer: AnswerValue | undefined,
    customValue?: string
  ) => {
    if (!question.required) return null;

    if (question.type === "multiselect") {
      const values = Array.isArray(answer) ? answer : [];
      if (values.length === 0) return "하나 이상 선택해주세요";
      if (values.includes("__other__") && !customValue?.trim()) {
        return "기타 내용을 입력해주세요";
      }
      return null;
    }

    if (question.type === "select") {
      const selected = typeof answer === "string" ? answer : "";
      if (!selected) return "하나 선택해주세요";
      if (selected === "__other__" && !customValue?.trim()) {
        return "기타 내용을 입력해주세요";
      }
      return null;
    }

    return null;
  };

  const handleSelect = useCallback((questionIndex: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
    setErrors((prev) => {
      if (prev[questionIndex]) {
        const newErrors = { ...prev };
        delete newErrors[questionIndex];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const handleMultiSelect = useCallback(
    (questionIndex: number, value: string, checked: boolean) => {
      setAnswers((prev) => {
        const current = (prev[questionIndex] as string[]) || [];
        const updated = checked
          ? [...current, value]
          : current.filter((v) => v !== value);
        return { ...prev, [questionIndex]: updated };
      });
      setErrors((prev) => {
        if (prev[questionIndex]) {
          const newErrors = { ...prev };
          delete newErrors[questionIndex];
          return newErrors;
        }
        return prev;
      });
    },
    []
  );

  const handleCustomChange = useCallback((questionIndex: number, value: string) => {
    setCustomValues((prev) => ({ ...prev, [questionIndex]: value }));
    setErrors((prev) => {
      if (prev[questionIndex]) {
        const newErrors = { ...prev };
        delete newErrors[questionIndex];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const goToNext = useCallback(() => {
    const currentQuestion = readyQuestions[currentStep];
    if (currentQuestion) {
      const error = getRequiredError(currentQuestion, answers[currentStep], customValues[currentStep]);
      if (error) {
        setErrors((prev) => ({ ...prev, [currentStep]: error }));
        return;
      }
    }
    if (currentStep < readyQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, readyQuestions, answers, customValues]);

  const goToPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < readyQuestions.length) {
      setCurrentStep(index);
    }
  }, [readyQuestions.length]);

  const formatAndSubmit = useCallback((skipValidation = false) => {
    if (!skipValidation) {
      const newErrors: Record<number, string> = {};
      readyQuestions.forEach((q, index) => {
        const error = getRequiredError(q, answers[index], customValues[index]);
        if (error) newErrors[index] = error;
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstErrorIndex = Math.min(...Object.keys(newErrors).map(Number));
        setCurrentStep(firstErrorIndex);
        return;
      }
    }

    setErrors({});
    const formattedAnswers: Record<string, string> = {};

    readyQuestions.forEach((q, index) => {
      const answer = answers[index];
      const custom = customValues[index];

      if (q.type === "multiselect") {
        const values = ((answer as string[]) || [])
          .map((v) => (v === "__other__" ? custom : v))
          .filter(Boolean);
        formattedAnswers[q.header] = values.length > 0 ? values.join(", ") : "없음";
      } else if (answer === "__other__") {
        formattedAnswers[q.header] = custom || "없음";
      } else {
        formattedAnswers[q.header] = answer ? String(answer) : "없음";
      }
    });

    setIsSubmitted(true);
    onSubmit(formattedAnswers);
  }, [readyQuestions, answers, customValues, onSubmit]);

  const handleSubmit = useCallback(() => formatAndSubmit(false), [formatAndSubmit]);
  const handleSkipAll = useCallback(() => formatAndSubmit(false), [formatAndSubmit]);

  if (!isStreaming && questions.length === 0 && readyQuestions.length === 0) {
    return null;
  }

  if (!isReady) {
    return (
      <div className={cn("w-full mt-4", className)}>
        <div className="flex items-center gap-2 font-ui">
          <Loader2Icon className="size-3.5 animate-spin text-text-secondary" />
          <span className="text-sm text-text-secondary">응답을 생성하는 중..</span>
        </div>
      </div>
    );
  }

  const currentQuestion = readyQuestions[currentStep];
  if (!currentQuestion) return null;

  const isReadOnly = isSubmitted || !isActive;

  const containerAnimation = animateEntrance
    ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: "easeOut" } }
    : { initial: false as const, animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      {...containerAnimation}
      className={cn("my-6 bg-highlight rounded-2xl p-5 md:p-6", className)}
    >
      {/* Section Header */}
      <div className="mb-4">
        <p className="font-ui text-xs font-semibold uppercase tracking-widest text-text-secondary mb-1.5">
          {readyQuestions.length > 1 && `${currentStep + 1} / ${readyQuestions.length}`}
          {readyQuestions.length > 1 && currentQuestion.type === "multiselect" && " · "}
          {currentQuestion.type === "multiselect" ? "복수 선택" : readyQuestions.length <= 1 ? "하나를 선택하세요" : ""}
          {isSubmitted && " · 완료"}
        </p>
        <h2 className="text-lg font-bold text-text-primary leading-snug">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Question Options */}
      <AnimatePresence mode="wait">
        <QuestionStep
          key={currentStep}
          question={currentQuestion}
          questionIndex={currentStep}
          value={answers[currentStep] || (currentQuestion.type === "multiselect" ? [] : "")}
          customValue={customValues[currentStep] || ""}
          error={errors[currentStep]}
          onSelect={isReadOnly ? () => {} : (value) => handleSelect(currentStep, value)}
          onMultiSelect={isReadOnly ? () => {} : (value, checked) => handleMultiSelect(currentStep, value, checked)}
          onCustomChange={isReadOnly ? () => {} : (value) => handleCustomChange(currentStep, value)}
          disabled={isReadOnly}
          animateEntrance={animateEntrance}
        />
      </AnimatePresence>

      {/* Footer with navigation */}
      {!isStreaming && !isReadOnly && (
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-divider/30">
          {isFirstStep ? (
            <div />
          ) : (
            <button
              onClick={goToPrev}
              className="font-ui text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              이전
            </button>
          )}

          {readyQuestions.length > 1 && (
            <PaginationDots total={readyQuestions.length} current={currentStep} onDotClick={goToStep} />
          )}

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              className="font-ui text-sm px-5 py-2 bg-text-primary text-white rounded-full hover:bg-text-primary/90 transition-colors"
            >
              제출
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="font-ui text-sm text-text-primary font-medium hover:opacity-70 transition-opacity"
            >
              다음
            </button>
          )}
        </div>
      )}

      {/* Read-only pagination */}
      {!isStreaming && isReadOnly && readyQuestions.length > 1 && (
        <div className="flex justify-center mt-5">
          <PaginationDots total={readyQuestions.length} current={currentStep} onDotClick={goToStep} />
        </div>
      )}
    </motion.div>
  );
});

StreamingQuestions.displayName = "StreamingQuestions";
