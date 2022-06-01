import { BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

export const assertAlmostEqual = (expected: string | BigNumber, actual: string | BigNumber) => {
  const expectedBN = BigNumber.from(expected);
  const actualBN = BigNumber.from(actual);
  const diffBN = expectedBN.gt(actualBN) ? expectedBN.sub(actualBN) : actualBN.sub(expectedBN);
  const tolerance = expectedBN.div(BigNumber.from("10000"));
  return expect(diffBN, `${actual} is not almost eqaual to ${expected}`).to.be.lte(tolerance);
};
