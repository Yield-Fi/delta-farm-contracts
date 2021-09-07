module.exports = {
  port: 6545,
  testrpcOptions: "-p 6545",
  copyPackages: ["zeppelin-solidity"],
  skipFiles: ["./contracts/Migrations.sol"],
  istanbulReporter: ["html", "lcov", "text", "json", "cobertura"],
};
