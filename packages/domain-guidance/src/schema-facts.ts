import { z } from 'zod';
import {
  ActivityJSONSchema,
  CourseSpecJSONSchema,
  LessonJSONSchema,
  MCQQuestionSchema,
} from '@open-edu/course-compiler';

/**
 * Runtime introspection of the authoritative `@open-edu/course-compiler`
 * course-spec Zod schemas. This is the ONLY thing that produces the derived
 * schema facts in `artifact-contract.json` — nothing is hand-maintained, so a
 * course-compiler schema change propagates on the next regeneration instead of
 * silently drifting (ADR-0009 "derivation, never re-declaration").
 */

export interface ArtifactSchemaField {
  name: string;
  type: string;
  required: boolean;
}

export interface ArtifactSchemaFacts {
  provenance: {
    package: '@open-edu/course-compiler';
    module: 'parser/json-input.ts';
    schema: 'CourseSpecJSONSchema';
    derived: 'runtime-zod-introspection';
  };
  format: 'openedu-course-spec';
  version: 1;
  requiredTopLevelKeys: string[];
  metadataFields: ArtifactSchemaField[];
  lessonFields: ArtifactSchemaField[];
  activityFields: ArtifactSchemaField[];
  questionFields: ArtifactSchemaField[];
  activitySteps: string[];
  activityTypes: string[];
}

interface ZodTypeDefWithValues {
  values?: readonly string[];
  value?: unknown;
  type?: z.ZodTypeAny;
  innerType?: z.ZodTypeAny;
  checks?: Array<{ kind: string; value?: unknown }>;
}

function describeType(schema: z.ZodTypeAny): string {
  const def = schema._def as ZodTypeDefWithValues;
  switch (schema._def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodString:
      return 'string';
    case z.ZodFirstPartyTypeKind.ZodNumber:
      return 'number';
    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return 'boolean';
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return `literal(${JSON.stringify(def.value)})`;
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return `enum(${def.values?.join(' | ') ?? 'unknown'})`;
    case z.ZodFirstPartyTypeKind.ZodArray: {
      const element = def.type ? describeType(def.type) : 'unknown';
      const length = def.checks?.find((c) => c.kind === 'length')?.value;
      return length === undefined ? `${element}[]` : `${element}[${String(length)}]`;
    }
    case z.ZodFirstPartyTypeKind.ZodObject:
      return 'object';
    case z.ZodFirstPartyTypeKind.ZodTuple:
      return 'tuple';
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return 'record';
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return def.innerType ? describeType(def.innerType) : 'unknown';
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return def.innerType ? describeType(def.innerType) : 'unknown';
    case z.ZodFirstPartyTypeKind.ZodDefault:
      return def.innerType ? describeType(def.innerType) : 'unknown';
    default:
      return schema._def.typeName ?? 'unknown';
  }
}

function fieldFacts(shape: Record<string, z.ZodTypeAny>): ArtifactSchemaField[] {
  return Object.entries(shape).map(([name, schema]) => ({
    name,
    type: describeType(schema),
    required: !schema.isOptional(),
  }));
}

function enumValues(schema: z.ZodTypeAny): string[] {
  return [...((schema._def as { values?: readonly string[] }).values ?? [])];
}

function shapeOf(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  return (schema as unknown as { shape: Record<string, z.ZodTypeAny> }).shape;
}

export function buildDerivedSchemaFacts(): ArtifactSchemaFacts {
  const topShape = CourseSpecJSONSchema.shape;
  const metadataShape = shapeOf(topShape.metadata);
  const activitySteps = enumValues(ActivityJSONSchema.shape.step);
  const activityTypes = enumValues(ActivityJSONSchema.shape.type);

  return {
    provenance: {
      package: '@open-edu/course-compiler',
      module: 'parser/json-input.ts',
      schema: 'CourseSpecJSONSchema',
      derived: 'runtime-zod-introspection',
    },
    format: 'openedu-course-spec',
    version: 1,
    requiredTopLevelKeys: Object.keys(topShape),
    metadataFields: fieldFacts(metadataShape),
    lessonFields: fieldFacts(LessonJSONSchema.shape),
    activityFields: fieldFacts(ActivityJSONSchema.shape),
    questionFields: fieldFacts(MCQQuestionSchema.shape),
    activitySteps,
    activityTypes,
  };
}
