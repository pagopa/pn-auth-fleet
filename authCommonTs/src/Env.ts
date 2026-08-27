/**
 * Reads an environment variable, throwing if it is missing and no default is
 * provided. Lambdas typically wrap this with their own `EnvVariableName` union
 * to keep call-site type-safety.
 *
 * @param name - The environment variable name
 * @param defaultValue - Optional fallback when the variable is not set
 */
export function retrieveEnvVariable(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`${name} is not set`);
  }
  return value;
}
