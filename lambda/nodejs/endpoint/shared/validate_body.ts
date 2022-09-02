type typeName = 'string' | 'number' | 'boolean' | 'object' | 'undefined';

export type schema = { [key: string]: typeName[] | typeName };

export const validateBodyAgainstSchema = (body: any, reference: schema): boolean => {
  if (body && typeof body === 'object') {
    return Object.entries(reference).every(([key, value]) => {
      return Array.isArray(value)
        ? value.some((type) => type === typeof body[key])
        : value === typeof body[key];
    });
  }
  return false;
};

export const validateBodyAgainstSchemaAllowUndefined = (body: any, reference: schema): boolean =>
  body ? validateBodyAgainstSchema(body, reference) : true;
