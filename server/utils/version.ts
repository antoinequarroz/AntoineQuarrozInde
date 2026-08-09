export interface VersionEnvironment {
  [key: string]: string | undefined
  APP_VERSION?: string
  APP_BUILD_TIME?: string
  NODE_ENV?: string
}

export function getVersionInfo(environment: VersionEnvironment = process.env) {
  return {
    version: environment.APP_VERSION || 'development',
    builtAt: environment.APP_BUILD_TIME && environment.APP_BUILD_TIME !== 'unknown'
      ? environment.APP_BUILD_TIME
      : null,
    environment: environment.NODE_ENV || 'development',
  }
}
