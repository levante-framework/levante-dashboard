#!/bin/bash

NAME=$1

if [ -z "$NAME" ]; then
  echo "❌ Missing name argument."
  echo "Example: npm run repository:new \"Users\""
  exit 1
fi

CLASS_NAME="${NAME}Repository"
INSTANCE_NAME="$(echo "${NAME:0:1}" | tr '[:upper:]' '[:lower:]')${NAME:1}Repository"
OUTPUT_DIR="src/firebase/repositories"
FILENAME="${OUTPUT_DIR}/${CLASS_NAME}.ts"

mkdir -p "$OUTPUT_DIR"

if [ -f "$FILENAME" ]; then
  echo "❌ File already exists: $FILENAME"
  exit 1
fi

cat > "$FILENAME" <<TEMPLATE
import { Repository } from '@/firebase/Repository';

interface ${NAME}Params {
  [key: string]: unknown;
}

interface ${NAME}Return {
  [key: string]: unknown;
}

interface ${NAME}ReturnResponse {
  data: ${NAME}Return;
}

class ${CLASS_NAME} extends Repository {
  constructor() {
    super();
  }

  async exampleFn(params?: ${NAME}Params): Promise<${NAME}Return> {
    const response = await this.call<${NAME}Params, ${NAME}ReturnResponse>(
      'exampleFn',
      params,
    );
    return response.data;
  }
}

export const ${INSTANCE_NAME} = new ${CLASS_NAME}();
TEMPLATE

echo "✅ Repository created: $FILENAME"