/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow SSH-tunneled dev access from the local Mac browser.
  allowedDevOrigins: ["127.0.0.1"],
};

module.exports = nextConfig;
