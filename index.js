const fs = require("fs");
const acorn = require("acorn");
const astring = require("astring");

const AST = acorn.parse(
  fs.readFileSync(process.argv[2]),
  { ecmaVersion: 6 }
);

const define = AST.body.find(b => b.type === "ExpressionStatement" && b.expression.callee.name === "define");
const mainFunction = define.expression.arguments.find(arg => 
  ["FunctionExpression", "ArrowFunctionExpression"].includes(arg.type)
);

const deps = mainFunction.params || [];
// TODO take requireJS paths config into account
const depsPaths = deps.length
  ? define.expression.arguments.find(arg => arg.type === "ArrayExpression").elements.map(el => el.value)
  : null;

let moduleBody = mainFunction.body.body;
let exportObject;

for (let st = moduleBody.length; st--; ) {
  if (moduleBody[st].type === "ReturnStatement") {
    exportObject = moduleBody[st].argument;
    moduleBody.splice(moduleBody.length - 1, 1);
    break;
  }
}

const exportExpression = exportObject ? {
  type: "ExpressionStatement",
  expression: {
    type: "AssignmentExpression",
    operator: "=",
    left: {
      type: "MemberExpression",
      object: {
        type: "Identifier",
        name: "module"
      },
      property: {
        type: "Identifier",
        name: "exports"
      },
      computed: false
    },
    right: exportObject,
  },
} : [];

const newAST = {
  type: "Program",
  body: deps.map((dep, index) => {
    return {
      type: "VariableDeclaration",
      declarations: [
        {
          type: "VariableDeclarator",
          id: { type: "Identifier", name: dep.name },
          init: {
            type: "CallExpression",
            callee: {
              type: "Identifier",
              name: "require"
            },
            arguments: [
              {
                type: "Literal",
                value: depsPaths[index],
              }
            ]
          }
        },
      ],
      kind: "const",
    }
  }).concat(moduleBody).concat(exportExpression),
  sourceType: "module",
}

const code = astring.generate(newAST);

fs.writeFileSync(process.argv[3] || process.argv[2], code);