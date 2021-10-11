/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");
const nanoMd = require("nano-markdown");
const watch = require("watch");

const PATH_TO_IGNORE = ["_sidebar", "libs", "mock", "interfaces", "utils"];
const TOP_LEVEL = __dirname;

/**
 *
 * File Object
 *
 */
function File(filePath, level = 0) {
  this.level = level;
  this.filePath = filePath;
  this.infos = path.parse(this.filePath);
  this.datas = {
    level: this.level,
  };

  this.parse = () => {
    this.setRoute();
    this.setName();

    if (this.isDirectory() && this.hasOtherThanIndexChildren()) {
      this.datas.children = parseDirectory(this.filePath, this.level + 1);
    }
  };

  this.setRoute = () => {
    if (this.isDirectory() && !this.hasIndexChildren()) return;

    this.route = path.relative(TOP_LEVEL, this.filePath);
    this.route = this.route.replace(/README\.md/i, "");
    this.route = this.route.replace(/\.md/i, "/");

    // home fix
    if (this.route.length === 0) this.route = "/";

    // Ensure all routes end with /
    if (this.isDirectory() && !this.route.endsWith("/")) this.route += "/";

    if (!this.isDirectory() && !this.isReadmeFile() && this.route.endsWith("/"))
      this.route = this.route.slice(0, -1);

    this.datas.route = this.route;
  };

  this.setNameFromFileName = () => {
    if (this.isHome()) {
      this.name = "Accueil";
    } else {
      this.name = this.infos.name;
      this.name = this.name.replace(".md", "");
      this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1);
    }
  };

  this.setNameFromH1 = () => {
    let fileToRead = null;

    if (!this.isDirectory()) fileToRead = this.filePath;

    if (this.isDirectory() && this.hasIndexChildren()) fileToRead = this.getIndexChildren();

    if (!fileToRead) return;

    let fileContent = fs.readFileSync(fileToRead, "utf8");
    let fileContentMd = nanoMd(fileContent);
    let regex = new RegExp(/<h1>(.*?)<\/h1>/);
    let firstH1 = regex.exec(fileContentMd);

    if (firstH1) this.name = firstH1[1];
  };

  this.setName = () => {
    this.setNameFromH1();

    if (!this.name) this.setNameFromFileName();

    this.datas.name = this.name;
  };

  this.isDirectory = () => {
    return fs.statSync(this.filePath).isDirectory();
  };

  this.isMdFile = () => {
    return this.infos.ext === ".md";
  };

  this.isReadmeFile = () => {
    return /readme/i.test(this.infos.name);
  };

  this.isIgnored = () => {
    return (
      PATH_TO_IGNORE.indexOf(this.infos.name) > -1 ||
      (!this.isMdFile() && !this.isDirectory()) ||
      (this.level > 0 && this.isReadmeFile()) ||
      (this.isDirectory() && !this.hasChildren())
    );
  };

  this.isHome = () => {
    return this.route === "/";
  };

  this.hasIndexChildren = () => {
    return fs.readdirSync(this.filePath).some((i) => /readme\.md/i.test(i));
  };

  this.getIndexChildren = () => {
    let index = fs.readdirSync(this.filePath).find((i) => /readme\.md/i.test(i));
    if (index) index = path.resolve(this.filePath, index);

    return index;
  };

  this.hasOtherThanIndexChildren = () => {
    return fs.readdirSync(this.filePath).some((i) => !/readme\.md/i.test(i));
  };

  this.hasChildren = () => {
    return fs.readdirSync(this.filePath).length > 0;
  };

  this.getDatas = () => {
    return this.datas;
  };
}

const parseDirectory = (dirPath, level = 0) => {
  return fs.readdirSync(dirPath).reduce((acc, fileName) => {
    const filePath = path.join(dirPath, fileName);
    const file = new File(filePath, level);

    if (file.isIgnored()) return acc;

    file.parse();

    acc.push(file.getDatas());

    return acc;
  }, []);
};

// Create text to insert
const createText = (a, txt = "") => {
  return a.reduce((acc, curr) => {
    let text = curr.route ? `- [${curr.name}](${curr.route})` : `- ${curr.name}`;

    acc += "  ".repeat(curr.level) + text + "\n";

    if (curr.children) {
      acc += createText(curr.children);
    }

    return acc;
  }, txt);
};

const execute = () => {
  let directoryStructure = parseDirectory(path.join(__dirname));

  let text = createText(directoryStructure);

  fs.writeFileSync(path.join(__dirname, "_sidebar.md"), text);
};

watch.watchTree(
  __dirname,
  {
    filter: (file) => {
      return (
        fs.statSync(file).isDirectory() ||
        (path.extname(file) === ".md" && path.basename(file, ".md") !== "_sidebar")
      );
    },
  },
  (f, curr, prev) => {
    // eslint-disable-next-line no-empty
    if (typeof f == "object" && prev === null && curr === null) {
    } else if (prev === null) {
      // file creation
      execute();
    } else if (curr.nlink === 0) {
      // file deletion
      execute();
    } else {
      // file change
      execute();
    }
  }
);

execute();
