// structure to hold a node's position. An `index` is sufficient to describe the full position
// but object exist to cache of height/rightness, because recomputing height and rightness
// from only index require Log(n) operations
class Position{
  constructor(index, height, rightness){
    this.i = index 
    this.h = height
    this.r = rightness // inherent unchanging property of every node index
  }
}

module.exports = Position
