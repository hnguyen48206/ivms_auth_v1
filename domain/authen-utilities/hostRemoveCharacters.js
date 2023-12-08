String.prototype.replaceAll = function(_f, _r, _c){ 

    var o = this.toString();
    var r = '';
    var s = o;
    var b = 0;
    var e = -1;
    if(_c){ _f = _f.toLowerCase(); s = o.toLowerCase(); }
  
    while((e=s.indexOf(_f)) > -1)
    {
      r += o.substring(b, b+e) + _r;
      s = s.substring(e+_f.length, s.length);
      b += e+_f.length;
    }
  
    // Add Leftover
    if(s.length>0){ r+=o.substring(o.length-s.length, o.length); }
  
    // Return New String
    return r;
  };

function removeExtraCharacters(str)
{
    let res= str.toString();
    return res.replaceAll('"','').replaceAll("'",'')
}
module.exports = removeExtraCharacters(process.env.DB_HOST);