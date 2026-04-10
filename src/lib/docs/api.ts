/**
 * TASK 142: API DOCUMENTATION
 *
 * Auto-generated API docs with OpenAPI spec.
 */


export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  parameters: APIParameter[];
  responses: APIResponse[];
  tags: string[];
}

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface APIResponse {
  status: number;
  description: string;
  schema?: any;
}

export async function generateOpenAPISpec(): Promise<any> {
  const endpoints = await getAllEndpoints();

  return {
    openapi: "3.0.0",
    info: {
      title: "SkaiScraper API",
      version: "1.0.0",
      description: "Insurance claims processing API",
    },
    paths: buildPaths(endpoints),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };
}

async function getAllEndpoints(): Promise<APIEndpoint[]> {
  return [
    {
      method: "GET",
      path: "/api/claims",
      description: "List all claims",
      parameters: [
        { name: "page", type: "integer", required: false, description: "Page number" },
        { name: "limit", type: "integer", required: false, description: "Items per page" },
      ],
      responses: [
        { status: 200, description: "Success" },
        { status: 401, description: "Unauthorized" },
      ],
      tags: ["Claims"],
    },
    // More endpoints...
  ];
}

function buildPaths(endpoints: APIEndpoint[]): any {
  const paths: any = {};

  for (const endpoint of endpoints) {
    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {};
    }

    paths[endpoint.path][endpoint.method.toLowerCase()] = {
      summary: endpoint.description,
      tags: endpoint.tags,
      parameters: endpoint.parameters.map((p) => ({
        name: p.name,
        in: "query",
        required: p.required,
        schema: { type: p.type },
        description: p.description,
      })),
      responses: endpoint.responses.reduce((acc, r) => {
        acc[r.status] = { description: r.description };
        return acc;
      }, {} as any),
      security: [{ bearerAuth: [] }],
    };
  }

  return paths;
}

export async function getAPIDocumentation(): Promise<string> {
  const spec = await generateOpenAPISpec();
  return JSON.stringify(spec, null, 2);
}
