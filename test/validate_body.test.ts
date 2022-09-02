import { postExerciseSchema } from '../lambda/nodejs/endpoint/exercise';
import { patchUserSchema } from '../lambda/nodejs/endpoint/user';
import {
  validateBodyAgainstSchema,
  validateBodyAgainstSchemaAllowUndefined,
} from '../lambda/nodejs/endpoint/shared/validate_body';

test('validate success', () => {
  const input: any = {
    assessment_id: 'string',
    duration_in_ms: 1,
    movement_quality: 1,
    type: 'string',
  };
  expect(validateBodyAgainstSchema(input, postExerciseSchema)).toBe(true);
});

test('validate missing required', () => {
  const input: any = {
    assessment_id: 'string',
    duration_in_ms: 1,
    //   type: 'string',
    movement_quality: 1,
  };
  expect(validateBodyAgainstSchema(input, postExerciseSchema)).toBe(false);
});

test('validate missing optional', () => {
  const input: any = {
    assessment_id: 'string',
    duration_in_ms: 1,
    type: 'string',
    //  movement_quality: 1,
  };
  expect(validateBodyAgainstSchema(input, postExerciseSchema)).toBe(true);
});

test('validate undefined input is allowed', () => {
  expect(validateBodyAgainstSchemaAllowUndefined(undefined, postExerciseSchema)).toBe(true);
});

test('validate {} input is allowed', () => {
  expect(validateBodyAgainstSchemaAllowUndefined({}, patchUserSchema)).toBe(true);
});
