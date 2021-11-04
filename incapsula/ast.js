const fs = require(`fs`);
const parse = require(`@babel/parser`).parse;

function fromFile(file) {
  const ast = parse(
    fs
      .readFileSync(file, {
        encoding : `UTF-8`
      })
      .toString()
  );
  return ast;
};

function fromString(str){
  const ast = parse(str);
  return ast;
}

module.exports = {
  fromFile,
  fromString
};
