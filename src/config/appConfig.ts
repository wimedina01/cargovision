import { featureFlags } from './featureFlags'

export const appConfig = {
  name: 'CargoVision',
  version: __APP_VERSION__,
  milestone: 1,
  defaultUnit: 'IN',
  developerMode: import.meta.env.DEV,
  features: featureFlags,
} as const
