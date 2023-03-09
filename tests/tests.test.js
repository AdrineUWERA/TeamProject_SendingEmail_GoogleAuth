const { expect } = require('chai');
const app = require("../index")
const chai =require("chai");
const chaiHttp =require("chai-http");

chai.should();

chai.use(chaiHttp);

function add(a, b) {
  return a + b;
}

describe('add', function() {
  it('should return the sum of two numbers', function() {
    expect(add(2, 3)).to.equal(5);
  });

  it('should handle negative numbers', function() {
    expect(add(-2, 3)).to.equal(1);
    expect(add(-2, -3)).to.equal(-5);
  });

  it('should handle decimals', function() {
    expect(add(2.5, 3.5)).to.equal(6);
  });
});

describe('home', () => { 
    
    it("should get the home page", function(done) {
        chai
        .request(app)
        .get("/")
        .end((err, response) => {
          response.should.have.status(200); 
          done();
        });
    })
 })
