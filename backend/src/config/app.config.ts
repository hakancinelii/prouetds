export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  uetds: {
    testWsdl:
      'https://servis.turkiye.gov.tr/services/g2g/kdgm/test/uetdsarizi?wsdl',
    prodWsdl:
      'https://servis.turkiye.gov.tr/services/g2g/kdgm/uetdsarizi?wsdl',
    environment: process.env.UETDS_ENV || 'test', // 'test' | 'production'
    timeout: parseInt(process.env.UETDS_TIMEOUT, 10) || 30000,
    maxRetries: parseInt(process.env.UETDS_MAX_RETRIES, 10) || 3,
  },
  ocr: {
    provider: process.env.OCR_PROVIDER || 'google-vision', // 'google-vision' | 'aws-textract'
    googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3',
    s3Bucket: process.env.S3_BUCKET || 'prouetds-uploads',
    s3Region: process.env.S3_REGION || 'eu-west-1',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
});
