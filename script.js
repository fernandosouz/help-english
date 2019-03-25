/*GET CAPTIONS*/
function littleHandController($scope) {
    $scope.itens = [];
    $scope.hideLogin = false;
    $scope.currentUser = "";

    $scope.changeVideo = function(){
      $scope.countVideo++;
      console.log($scope.countVideo);
      console.log(player);
      player.loadVideoById($scope.videos[$scope.countVideo], 5, "large")
      $scope.getCaptions($scope.videos[$scope.countVideo]);
    }

    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // User is signed in.

        //document.getElementById("user_div").style.display = "block";
        //document.getElementById("login_div").style.display = "none";
        var user = firebase.auth().currentUser;

        if(user != null){
        }

      } else {
        // No user is signed in.

        document.getElementById("user_div").style.display = "none";
        document.getElementById("login_div").style.display = "block";

      }
    });

    $scope.login = function(){
      console.log("login");


      var userEmail = document.getElementById("email_field").value;
      var userPass = document.getElementById("password_field").value;

      firebase.auth().signInWithEmailAndPassword(userEmail, userPass).then(function(user){

        player = new YT.Player('player', {
          height: '390',
          width: '640',
          videoId: $scope.videos[$scope.countVideo],
          playerVars: {rel: 0, autoplay: 1, controls: 0}
        });
        $scope.getCaptions($scope.videos[$scope.countVideo]);

        console.log(user.uid);
        $scope.currentUser = user.uid;

        firebase.database().ref('/users/' + $scope.currentUser + '/words_eliminated').once('value').then(function(snapshot){
          console.log(snapshot.val());
          $scope.showInputWordsEliminated = snapshot.val() > 0;
          $scope.qnt_words_eliminated = snapshot.val();
          $scope.$apply();
        });

        readFromUserOnce($scope.currentUser, function(p){
            if(p === null){
              firebase.database().ref('users/' + $scope.currentUser ).set({
                words: {
                  hello: {
                    word_description: "hello",
                    count: 1
                  }
                },
                words_eliminated: 0
              });

              firebase.database().ref('/users/' + $scope.currentUser + '/words_eliminated').once('value').then(function(snapshot){
                $scope.showInputWordsEliminated = snapshot.val() > 0;
                $scope.qnt_words_eliminated = snapshot.val();
                $scope.$apply();
              });

              $scope.hideLogin = true;
              $scope.$apply();
            }else{
              $scope.hideLogin = true;
              $scope.$apply();

              for (var key in p) {
                if (p.hasOwnProperty(key)) {
                  if(wordsOfUser.indexOf(" " + p[key].word_description + " ") == -1){
                    arrayObjOfUser.push(p[key]);
                    wordsOfUser += p[key].word_description + " ";
                    }
                }
              }

              firebase.database().ref('/users/' + $scope.currentUser + '/words_eliminated').once('value').then(function(snapshot){
                $scope.showInputWordsEliminated = snapshot.val() > 0;
                $scope.qnt_words_eliminated = snapshot.val();
                $scope.$apply();
              });
            }
        });


      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;

        window.alert("Error : " + errorMessage);

        // ...
      });

    };

    $scope.logout = function(){
      $scope.hideLogin = false;
      firebase.auth().signOut();
    }

    $scope.playVideo = function() {
      player.playVideo();
    }

    $scope.pauseVideo = function() {
      player.pauseVideo();
      $scope.handleCaption(captionEn);
    }

    $scope.handleCaption = function(caption){
      var arrayText = ""
      var y = $scope.xmlToJson(caption);
      var variationX = 10;
      var start = null;
      var end = player.getCurrentTime() + variationX;
      var x;

        if(player.getCurrentTime() > variationX){
          start = player.getCurrentTime() - variationX;
        }else{
          start = 0;
        }

      for (x in y.transcript.text) {
          var startX = parseFloat(y.transcript.text[x]["@attributes"].start);
          var endX = parseFloat(y.transcript.text[x]["@attributes"].start) + parseFloat(y.transcript.text[x]["@attributes"].dur);
          if(startX >= start && endX <= end){
            arrayText += y.transcript.text[x]["#text"] + " ";
          }
          //when the last one
          if(x == y.transcript.text.length - 1){
            $scope.handleData(arrayText);
          }
      }
    }

    $scope.handleData = function(textObj){
        var parser = new DOMParser;
        var dom = parser.parseFromString(
            '<!doctype html><body>' + textObj, 'text/html');
        var decodedString = dom.body.textContent;
        decodedString = decodedString.replace(/[.*+?!^${}()";:,|[\]\\]/g, '');
        arrayWordsFromVideo = decodedString.replace(/\r?\n|\r/, '').split(" ");

        //trata o array de palavras do video
        arrayWordsFromVideo = arrayWordsFromVideo.filter(word => word.indexOf("-") == -1 && !$scope.tem_numeros(word) && word.length > 0 && word !== undefined);
        arrayWordsFromVideo = arrayWordsFromVideo.map(word => word.toLowerCase());

        //pega o texto palavras do usuário e transforma em array
        arrayWordsFromUser = wordsOfUser.split(" ");

        //deleta do texto do vídeo as palavras que usuário tem no banco E contém count >= 10
        arrayWordsFromVideo = arrayWordsFromVideo.filter(function(word){
            //a palavra do video está nas palavras do usuáirio?
            if(arrayWordsFromUser.indexOf(word) !== -1){
                //a palavra no array de objetos, na propriedade count, tem menos de 10?
                if(arrayObjOfUser[arrayWordsFromUser.indexOf(word)].count < 10){
                  return true;
                }else{
                  return false;
                }
            }else{
              return true;
            }
        });

        //NESSE MOMENTO TENHO AS PALAVRAS DO VÍDEO SEM AS PALAVRAS DO USUÁRIO COM COUNT >= 10

        //Pega quais palavras do banco de dados do usuário estão nas palavras do vídeo(que foram decididas por minuto)
        arrayToShowToUser = arrayWordsFromVideo.filter(word => arrayWordsFromUser.indexOf(word) !== -1);

        //filtra caso tenha palavras repetidas
        arrayToShowToUser = arrayToShowToUser.filter(function(word, i){
          return (arrayToShowToUser.indexOf(word) == i);
        });

        //copia
        arrayWordsLearning = arrayToShowToUser.map(obj => obj);

        var p = 0;
        while(arrayToShowToUser.length < 10 && p < arrayWordsFromVideo.length){
          if(arrayWordsFromVideo[p] !== undefined){
            arrayToShowToUser.push(arrayWordsFromVideo[p]);
            arrayToShowToUser = arrayToShowToUser.filter(function(word, i){
              return (arrayToShowToUser.indexOf(word) == i);
            });
          }
          p++;
        }


        $scope.getTranslationOfarray(arrayToShowToUser);
    }

    $scope.getTranslationOfarray = function(arrayObj){
      $scope.itens = [];
      var table = document.createElement('table');
      table.style = 'width:500px;border:1px solid #CCC;';
      var tbody = document.createElement('tbody');
      let tr = document.createElement('tr');

      arrayObj.map(function(word, x){
        $.ajax({
             type: "GET",
             url: "https://translation.googleapis.com/language/translate/v2?key=AIzaSyBMhAfmuxipl-WQmPNj1BOvx9ImPqVmPdA",
             data: {
                    "q": arrayObj[x],
                    "source": "en",
                    "target": "pt",
                    "format": "text"
                  }
          }).done(function (response) {
              translatedObj[x] = {
                  word: arrayObj[x],
                  translate: response.data.translations[0].translatedText,
                  iknow: false
              };

              $scope.itens.push(
                translatedObj[x]
              );

              $scope.$apply();
          }).fail(function (response) {
             console.log(response);
          });
      })


      table.appendChild(tbody);
      document.body.appendChild(table);
    }

    $scope.continuePlay = function() {

        player.playVideo();

        if($scope.itens.length == 0){
            return;
        }

        $scope.itensWords = $scope.itens.map(function(word){
          return word.word;
        });

        console.log($scope.itensWords);

        //PEGA DO ARRAY DE OBJETOS OS OBJETOS QUE SERÃO ATUALIZADOS
        var arrayObjToUpdate = arrayObjOfUser.filter(obj => arrayWordsLearning.indexOf(obj.word_description) !== -1 && obj.count < 10);
        //FAZ UM ARRAY SÓ COM PALAVRAS
        var wordsToUpdate = arrayObjToUpdate.map(obj => obj.word_description);

        //PEGA AS PALAVRAS MOSTRADAS PRO USUÁRIO QUE ELE NÃO CONHECE, OU SEJA QUE NÃO ESTÃO NO ARRAY DE UPDATE
        var wordsToInclude = arrayToShowToUser.filter(word => wordsToUpdate.indexOf(word) === -1);

        console.log("     ");
        console.log("     ");
        console.log("     ");
        console.log("     ");
        arrayObjToUpdate.map(function(word){
          var count = word.count + 1;
          if($scope.itens[$scope.itensWords.indexOf(word.word_description)].iknow){
            count = 10;
          }
          console.log("ATUALIZANDO -> " + word.word_description + " para: " + count);
          newWordToUser(word.word_description, $scope.currentUser, count );
        });

        wordsToInclude.map(function(word){
          var count = 1;
          if($scope.itens[$scope.itensWords.indexOf(word)].iknow){
            count = 10;
          }
          console.log("INCLUINDO -> " + word + " para: " + count);
          newWordToUser(word, $scope.currentUser, count);
        });


        $scope.callToast("Palavras atualizadas com sucesso!");
        //ZERAR
        wordUserByVideo = [];
        arrayWordsFromVideo = [];
        arrayWordsLearning = [];
        wordsOfUser = "";
        arrayObjOfUser =[];
        arrayToShowToUser =[];



        //LER O BANCO DE NOVO
        readFromUserOnce($scope.currentUser, function(p){
            for (var key in p) {
              if (p.hasOwnProperty(key)) {
                  if(wordsOfUser.indexOf(" " + p[key].word_description + " ") == -1){
                    arrayObjOfUser.push(p[key]);
                    wordsOfUser += p[key].word_description + " ";
                  }
              }
          }
        });

    }

    $scope.tem_numeros = function(texto){
       for(i=0; i<texto.length; i++){
          if (numeros.indexOf(texto.charAt(i),0)!=-1){
             return 1;
          }
       }
       return 0;
    }

    $scope.getRandomArbitrary = function(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min)) + min;
    }

    $scope.randOrd = function() {
      return (Math.round(Math.random())-0.5);
    }

    $scope.eliminarPalavras = function(){
      includeTheFirstXWords($scope.currentUser, $scope.qnt_words_eliminated);
      $scope.callToast("Palavras eliminadas com sucesso!");
    }

    $scope.getCaptions = function(urlVideo){
      $.ajax({
         type: "POST",
         url: "https://video.google.com/timedtext?type=track&lang=en&v="+urlVideo
      }).done(function (response) {
            captionEn = response;
      }).fail(function (response) {
         console.log("fail captions");
      });
    }

    $scope.xmlToJson = function(xml) {

        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) { // element
          // do attributes
          if (xml.attributes.length > 0) {
          obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++) {
              var attribute = xml.attributes.item(j);
              obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
          }
        } else if (xml.nodeType == 3) { // text
          obj = xml.nodeValue.toString();
          if (/[\n|\n\r]/.test(obj)) {
            obj = obj.replace(/[\n|\n\r]/g,' ');
          }
        }

        // do children
        if (xml.hasChildNodes()) {
          for(var i = 0; i < xml.childNodes.length; i++) {
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
            if (typeof(obj[nodeName]) == "undefined") {
              obj[nodeName] = $scope.xmlToJson(item);
            } else {
              if (typeof(obj[nodeName].push) == "undefined") {
                var old = obj[nodeName];
                obj[nodeName] = [];
                obj[nodeName].push(old);
              }
              obj[nodeName].push($scope.xmlToJson(item));
            }
          }
        }
        return obj;
      };

    $scope.getTranslationOfString = function(string, callback){

        $.ajax({
             type: "GET",
             url: "https://translation.googleapis.com/language/translate/v2?key=AIzaSyBMhAfmuxipl-WQmPNj1BOvx9ImPqVmPdA",
             data: {
                    "q": string,
                    "source": "en",
                    "target": "pt",
                    "format": "text"
                  }
          }).done(function (response) {
              callback(response, string);
          }).fail(function (response) {
             console.log(response);
          });

      }

      $scope.countVideo = 0;

      $scope.videos = [
        'jls7MYW5egY',
        'nRiHKI_8u0A',
        '4E_1AB1rsSw',
        'XewnyUJgyA4',
        'wzkFoetp-_M',
        'UIAm1g_Vgn0',
        'pxEcvU0Vp_M',
        '8jPQjjsBbIc',
        'NcX2AwH3cG8'
      ];

      var numeros="0123456789";
      var translatedObj = [];
      var textObj = null;
      var captionEn = null;
      var wordUserByVideo = [];
      var arrayWordsFromVideo = [];
      var arrayWordsLearning = [];
      var url = 'UIAm1g_Vgn0'
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      $scope.getCaptions(url);

    $scope.callToast = function (msg) {
        var x = document.getElementById("snackbar");
        x.className = "show";
        x.innerHTML = msg;
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
    }

}
