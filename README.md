# http-peeper

HTTP/HTTPS protocol peeper

## WHAT IS THIS

This is a proxy server for peeping HTTP/HTTPS communication, mainly for debugging.

## REQUIRED

## common

* OpenSSL command
  Used to generate self signed certificate.

### macOS

Since you assign a local host to the host name, you need to change `hosts` file.

Use [Hoster](http://www.redwinder.com/macapp/hoster/) or directly edit `hosts` file and add the setting.

### Qt 5

Append this code.

```
    QNetworkAccessManager *manager = getManager();
    QNetworkReply *reply = manager->post(request);
#ifndef QT_NO_DEBUG // Recommended only when debugging
    connect(reply, &QNetworkReply::sslErrors, this, [=](QList<QSslError>) {
        auto reply_ = qobject_cast<QNetworkReply*>(sender());
        reply_->ignoreSslErrors();
    });
#endif
```

## INSTALL

```
# npm install
```

## USAGE

```
# sudo npm start
```

result

```
<0001> 2017-09-02T07:14:32.795Z| ------------------------------
<0001> 2017-09-02T07:14:32.799Z| >> method: POST /1.1/statuses/update.json HTTP/1.1
<0001> 2017-09-02T07:14:32.799Z| >> headers:
<0001> 2017-09-02T07:14:32.799Z| >>  authorization: OAuth oauth_consumer_key=".....",oauth_nonce=".....",oauth_signature="%2B.....%3D",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1504336472",oauth_token=".....",oauth_version="1.0"
<0001> 2017-09-02T07:14:32.799Z| >>  content-type: application/x-www-form-urlencoded
<0001> 2017-09-02T07:14:32.799Z| >>  cookie: personalization_id=".....=="; guest_id=.....
<0001> 2017-09-02T07:14:32.799Z| >>  content-length: 53
<0001> 2017-09-02T07:14:32.799Z| >>  connection: Keep-Alive
<0001> 2017-09-02T07:14:32.799Z| >>  accept-encoding: gzip, deflate
<0001> 2017-09-02T07:14:32.799Z| >>  accept-language: ja-JP,en,*
<0001> 2017-09-02T07:14:32.799Z| >>  user-agent: Mozilla/5.0
<0001> 2017-09-02T07:14:32.799Z| >>  host: api.twitter.com
<0001> 2017-09-02T07:14:32.799Z| >> data: status=.....
<0001> 2017-09-02T07:14:37.826Z| << headers:
<0001> 2017-09-02T07:14:37.826Z| <<  content-encoding: gzip
<0001> 2017-09-02T07:14:37.826Z| <<  content-length: 89
<0001> 2017-09-02T07:14:37.826Z| <<  content-type: application/json; charset=utf-8
<0001> 2017-09-02T07:14:37.826Z| <<  date: Sat, 02 Sep 2017 07:14:37 GMT
<0001> 2017-09-02T07:14:37.826Z| <<  server: tsa_m
<0001> 2017-09-02T07:14:37.826Z| <<  strict-transport-security: max-age=631138519
<0001> 2017-09-02T07:14:37.826Z| <<  x-connection-hash: .....
<0001> 2017-09-02T07:14:37.826Z| <<  x-response-time: 156
<0001> 2017-09-02T07:14:37.826Z| <<  x-tsa-request-body-time: 0
<0001> 2017-09-02T07:14:37.826Z| << body: {"errors":[{"code":32,"message":"Could not authenticate you."}]}
```

## LICENSE

&copy; 2017 sharkpp

This software is licensed under a [The MIT License](http://opensource.org/licenses/MIT).
