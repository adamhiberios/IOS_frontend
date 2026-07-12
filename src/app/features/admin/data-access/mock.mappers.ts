import { type MockQuestionDto, type MockQuestionOptionDto } from './mock.dto';
import {
  type MockQuestion,
  type MockQuestionOption,
  type MockQuestionType,
  isMockQuestionType,
} from './mock.model';

/** Normalise the wire `questionType` to a known union (defaults to `mcq`). */
function toQuestionType(value: string): MockQuestionType {
  return isMockQuestionType(value) ? value : 'mcq';
}

function toOption(dto: MockQuestionOptionDto): MockQuestionOption {
  return { id: dto.id, optionText: dto.optionText, isCorrect: dto.isCorrect };
}

/** Map a wire `MockQuestionDto` to a `MockQuestion`. */
export function toMockQuestion(dto: MockQuestionDto): MockQuestion {
  return {
    id: dto.id,
    certId: dto.certId,
    questionText: dto.questionText,
    questionType: toQuestionType(dto.questionType),
    position: dto.position,
    active: dto.active,
    options: dto.options.map(toOption),
  };
}
