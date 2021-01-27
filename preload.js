const http = require("http");
const crypto = require("crypto");
const querystring = require("querystring");

let timer;

const truncate = (q) => {
  var len = q.length;
  if(len<=20) return q;
  return q.substring(0, 10) + len + q.substring(len-10, len);
}

const translate = (query, callbackSetList) => {
  query = query.replace(/^\s+|\s+$/g, "");
  let _appKey = utools.db.get('appKey');
  if (!_appKey) {
    utools.showNotification('请输入有道翻译appKey');
    return;
  }
  let appKey = _appKey.data;
  let _key = utools.db.get('key');
  if (!_key) {
    utools.showNotification('请输入有道翻译key');
    return;
  }
  let key = _key.data;
  let salt = (new Date).getTime();
  let curtime = Math.round(new Date().getTime() / 1000);
  let from = 'auto';
  let to = 'auto';
  let str1 = appKey + truncate(query) + salt + curtime + key;
  const hash = crypto.createHash('sha256');
  hash.update(str1);
  let sign = hash.digest('hex');
  const req = http.request({
    hostname: "openapi.youdao.com",
    path: "/api",
    method: "post",
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, (res) => {
    let rawData = "";
    res.on("data", (chunk) => {
      rawData += chunk;
    });
    res.on("end", () => {
      console.log(rawData);
      try {
        let list = [];
        let jsonData = JSON.parse(rawData);
        if (jsonData.errorCode !== "0") {
          if (jsonData.errorCode === "108" || jsonData.errorCode === "202") {
            utools.showNotification("应用ID或应用密钥错误");
          } else {
            utools.showNotification("错误码: " + jsonData.errorCode);
          }
          return;
        }
        if (jsonData.translation) {
          list.push({
            title: jsonData.translation.join(";"),
            description: query
          });
        }
        if (jsonData.web) {
          jsonData.web.forEach((item) => {
            list.push({
              title: item.value.join(";"),
              description: item.key
            })
          })
        }
        callbackSetList(list);
      } catch(e) {
        utools.showNotification(rawData);
      }
    });
  });
  req.on("error", (err) => {
    utools.showNotification(err.message);
  });
  req.write(querystring.stringify({
    q: query,
    appKey: appKey,
    salt: salt,
    from: from,
    to: to,
    sign: sign,
    signType: "v3",
    curtime: curtime
  }));
  req.end();
}

window.exports = {
  "list": {
    mode: "list",
    args: {
      search: (action, searchWord, callbackSetList) => {
        if (searchWord) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            translate(searchWord, callbackSetList);
          }, 200);
        } else {
          callbackSetList([{
            title: '',
            description: ''
          }]);
        }
      },
      select: (action, itemData) => {
        utools.hideMainWindow();
        utools.copyText(itemData.title);
        utools.outPlugin();
      }
    }
  },
  "appKey": {
    mode: "list",
    args: {
      search: (action, searchWord, callbackSetList) => {
        callbackSetList([{
          title: searchWord,
          description: ''
        }]);
      },
      select: (action, itemData) => {
        utools.hideMainWindow();
        let appKey = utools.db.get('appKey');
        let obj = {
          _id: 'appKey',
          data: itemData.title
        }
        if (appKey) {
          obj._rev = appKey._rev;
        }
        utools.db.put(obj);
        utools.outPlugin();
      },
      placeholder: "请输入有道翻译应用ID"
    }
  },
  "key": {
    mode: "list",
    args: {
      search: (action, searchWord, callbackSetList) => {
        callbackSetList([{
          title: searchWord,
          description: ''
        }]);
      },
      select: (action, itemData) => {
        utools.hideMainWindow();
        let key = utools.db.get('key');
        let obj = {
          _id: 'key',
          data: itemData.title
        }
        if (key) {
          obj._rev = key._rev;
        }
        utools.db.put(obj);
        utools.outPlugin();
      },
      placeholder: "请输入有道翻译应用密钥"
    }
  }
}