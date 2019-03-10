setCookie(name, val) {
  document.cookie = [name, val].join('=') + ';';
}

getCookies() {
  var cookie = decodeURIComponent(document.cookie);
  cookie = cookie.split(';');
  
  var cookieObj = {};
  for (let i = 0; i < cookie.length; i++) {
    let mapping = cookie[i].split('=');
    cookieObj[mapping[0]] = mapping [1];
  }
  return cookieObj;
}