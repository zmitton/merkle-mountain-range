class FileDB {
  constructor(filePath){
    this.filePath = filePath
    this.fd = fs.openSync(filePath, 'a+')
  }

  async nodeLength(){
    let size = await this._size()
    let length = size/32
    if(MMR._isCorrupt(length)){
      throw new Error("isCorrupt length for tree " + length)
    }
    return length
  }

  async leafLength(){

  }

  async read(index){
    var indexToFirstByte = index*32
    var chunk = Buffer.alloc(32)
    return new Promise((resolve, reject)=>{
      fs.read(this.fd, chunk, 0, 32, indexToFirstByte, (e, r)=>{
        if(e){
          reject(e)
        }else{
          resolve(chunk)
        }
      })
    })
  }

  async readBatch(indices){
    return Promise.all(indices.map((i) => { return this.read(i) }))
  }

  async write(hash, index){
    let size = await this._size()
    let length = size/32
    if(!index){ // default write last element
      let index = size/32 
    } else if(index > length){
      console.log('IIIIIIINDEX GREATER THAN LENGTH')
      let amountToWrite = (index - length) * 32
      let padding = Buffer.alloc(amountToWrite)
      await this._write(this.fd, padding, amountToWrite , length * 32)
    }
    return this._write(this.fd, hash, 32, index * 32)
  }

  async _write(db, inputData, amount, startPos){
    console.log(db, inputData, amount, startPos)
    return new Promise((resolve, reject)=>{
      fs.write(db, inputData, 0, amount, startPos, (e, r)=>{
        if(e){
          reject(e)
        }else{
          resolve(r)
        }
      })
    })
  }

  async _size(){
    return new Promise((resolve, reject)=>{
      fs.stat(this.filePath, (e,s) => {
        if(e){
          reject(e)
        }else{
          var length = Math.round(s.size/32)
          if(s.size % 32 != 0 ){
            reject(new Error("Corrupt length for db. Size not divis by 32 " + s.size))
          }else{
            resolve(s.size)
          }
        }
      })
    })
  }

}


module.exports = FileDB



