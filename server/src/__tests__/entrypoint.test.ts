// docker-entrypoint.sh 行尾守卫：该脚本在 Linux 容器内执行，一旦被写回 CRLF，
// 本地 docker build 会把 \r 带进镜像（构建上下文按磁盘字节原样 COPY），
// shebang 变成 #!/bin/sh\r 导致容器启动即 exec 失败；
// 而 .gitattributes 的 text 归一化会让 git status 显示"干净"，该损坏会长期潜伏。
import fs from 'fs';
import path from 'path';

describe('docker-entrypoint.sh 行尾守卫', () => {
  it('必须只使用 LF 行尾且 shebang 完整', () => {
    const filePath = path.join(__dirname, '..', '..', 'docker-entrypoint.sh');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content.includes('\r')).toBe(false);
    expect(content.startsWith('#!/bin/sh\n')).toBe(true);
  });
});
