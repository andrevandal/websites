type ImportMetaEnv = {
  readonly SITE_URL: string
  readonly PUBLIC_GOOGLE_TAG_ID: string
  readonly PUBLIC_GOOGLE_ADS_CONVERSION_ID: string
  readonly PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: string
}

type ImportMeta = {
  readonly env: ImportMetaEnv
}
