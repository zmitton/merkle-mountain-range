const WORD_SIZE = 64

class FileBasedDB {
  constructor(filePath){
    this.filePath = filePath
    this.fd = fs.openSync(filePath, 'a+')
  }

  async get(index){
    var indexToFirstByte = index*WORD_SIZE
    var chunk = Buffer.alloc(WORD_SIZE)
    return new Promise((resolve, reject)=>{
      fs.read(this.fd, chunk, 0, WORD_SIZE, indexToFirstByte, (e, r)=>{
        if(e){
          reject(e)
        }else{
          resolve(chunk)
        }
      })
    })
  }
  async set(index, value){
    return new Promise((resolve, reject)=>{
      fs.write(this.fd, value, 0, WORD_SIZE, ((index + 1) * WORD_SIZE), (e, r)=>{ // +1 because 1st elem holds length data
        if(e){
          reject(e)
        }else{
          resolve(r)
        }
      })
    })
  }

  async getLeafLength(){
    let lengthBuffer = await this.get(0)
    this.leafLength = lengthBuffer.readUInt32BE(WORD_SIZE - 4)
    return this.leafLength
  }
  async setLeafLength(leafLength){ // must have semaphore wrapper defined from MMR interface
    let lengthBuffer = Buffer.alloc(64).writeUInt8(leafLength, WORD_SIZE - 4)
    this.leafLength = leafLength
    return  this.write(lengthBuffer, 0)
  }


  // async write(value, index){
  //   let length = await this.nodeLength()
  //   if(!index){ // default write last element
  //     let index = length 
  //   } else if(index > length){
  //     throw new Error('cant add leaf index#' + index + ' before leaf index#' + (length - 1))
  //     // console.log('IIIIIIINDEX GREATER THAN LENGTH')
  //     // let amountToWrite = (index - length) * WORD_SIZE
  //     // let padding = Buffer.alloc(amountToWrite)
  //     // await this._write(this.fd, padding, amountToWrite , length * WORD_SIZE)
  //   }
  //   // return this._write(this.fd, value, WORD_SIZE, index * WORD_SIZE)
  //   return new Promise((resolve, reject)=>{
  //     fs.write(this.fd, value, 0, WORD_SIZE, (index * WORD_SIZE), (e, r)=>{
  //     // fs.write(db, inputData, 0, amount, startPos, (e, r)=>{
  //       if(e){
  //         reject(e)
  //       }else{
  //         resolve(r)
  //       }
  //     })
  //   })

  // }
  // async nodeLength(){
  //   let byteLength = await this._byteLength()
  //   let length = byteLength/WORD_SIZE
  //   return length
  // }

  // async _byteLength(){
  //   return new Promise((resolve, reject)=>{
  //     fs.stat(this.filePath, (e,s) => {
  //       if(e){
  //         reject(e)
  //       }else{
  //         if(s.size % WORD_SIZE != 0 ){
  //           reject(new Error("Corrupt length for db. Size not divis by WORD_SIZE " + s.size))
  //         }else{
  //           resolve(s.size)
  //         }
  //       }
  //     })
  //   })
  // }
}


module.exports = FileBasedDB






