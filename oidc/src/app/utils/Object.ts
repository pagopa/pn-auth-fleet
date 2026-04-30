import { maskString } from "./String";

export function copyAndMaskObject<T extends Record<string, any>>(
  originalObject: T,
  sensitiveFields: Array<keyof T>
): T {
  const copiedObject = { ...originalObject };

  sensitiveFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(copiedObject, field)) {
      const value = copiedObject[field];
      if (typeof value === "string") {
        copiedObject[field] = maskString(value) as T[keyof T];
      }
    }
  });

  return copiedObject;
}
