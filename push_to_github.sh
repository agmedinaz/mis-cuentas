#!/bin/bash
# Uso: GITHUB_TOKEN=ghp_xxx GITHUB_USER=tu_usuario bash push_to_github.sh

set -e

TOKEN="$GITHUB_TOKEN"
USER="$GITHUB_USER"
REPO="mis-cuentas"

if [ -z "$TOKEN" ] || [ -z "$USER" ]; then
  echo "ERROR: Definí GITHUB_TOKEN y GITHUB_USER antes de correr este script"
  exit 1
fi

echo "→ Creando repositorio $USER/$REPO en GitHub..."
curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"description\":\"App de finanzas personales\",\"private\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Repo:', d.get('html_url', d.get('message','?')))"

echo "→ Inicializando git..."
cd "$(dirname "$0")"
git init
git add .
git commit -m "feat: initial commit — Mis Cuentas app"

echo "→ Subiendo a GitHub..."
git remote add origin "https://$USER:$TOKEN@github.com/$USER/$REPO.git"
git branch -M main
git push -u origin main

echo ""
echo "✅ ¡Listo! Repositorio en: https://github.com/$USER/$REPO"
echo ""
echo "Próximos pasos:"
echo "  1. Activá GitHub Pages en Settings > Pages > Branch: main / root"
echo "     (o desplegá en Vercel/Netlify para PWA)"
echo "  2. Para el instalador de Windows, creá un tag:"
echo "     git tag v1.0.0 && git push origin v1.0.0"
echo "     GitHub Actions va a compilar el .msi automáticamente"
