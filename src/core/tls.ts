import fs from 'node:fs';
import tls from 'node:tls';
export function install(){for(const file of ['/usr/local/share/ca-certificates/e2b-ca.crt','/etc/ssl/certs/ca-certificates.crt']){if(!fs.existsSync(file))continue;try{const pem=fs.readFileSync(file,'utf8');for(const cert of pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)||[]){const roots=tls.rootCertificates as readonly string[];if(!roots.includes(cert))(tls.rootCertificates as string[]).push(cert);}if(!process.env.NODE_EXTRA_CA_CERTS)process.env.NODE_EXTRA_CA_CERTS=file;break;}catch{}}}
