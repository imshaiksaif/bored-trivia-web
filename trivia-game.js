$(".game-modal-close").click(closeGameModal);
$("[play-game='trivia']").click(openGameModal);

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getProfileImg(idx) {
  const imgUrls = [
    "https://uploads-ssl.webflow.com/605af82a5a68bb31cb4570aa/60fe5c521d0a1dc4046db671_IMG_1187%20(1).png",
    "https://uploads-ssl.webflow.com/605af82a5a68bb31cb4570aa/60fe5c4f89d23903c4346b94_IMG_1188%20(1).png",
    "https://uploads-ssl.webflow.com/605af82a5a68bb31cb4570aa/60fe5c4e6bff0e5564584979_IMG_1192%20(1).png",
    "https://uploads-ssl.webflow.com/605af82a5a68bb31cb4570aa/60fe5c509fb2983d1d2f2c08_IMG_1187-1%20(1).png",
  ];
  return imgUrls[idx] || imgUrls[imgUrls.length - 1];
}

function getUserName(idx) {
  const userNames = ["You", "Bot-tom", "Bot-any", "Bot-tle"];
  return userNames[idx] || userNames[userNames.length - 1];
}

class User {
  constructor(name, imgUrl) {
    this.name = name;
    this.points = 0;
    this.imgUrl = imgUrl;
    this.uniId = this.name + getRandomInt(0, 100);
    this.firstTimeLoad = true;
  }

  getUserData() {
    return {
      name: this.name,
      points: this.points,
      imgUrl: this.imgUrl,
    };
  }

  getProfileDOM() {
    const showPointsBlock =
      (this.firstTimeLoad && this.points > 0) || !this.firstTimeLoad;

    setTimeout(() => {
      this.firstTimeLoad = false;
    }, 1000);
    return `<div id="${this.uniId}" class="game-user-profile-block">
                <div class="profile-img-holder">
                    <img src=${
                      this.imgUrl
                    } loading="lazy" alt="" class="profile-user-img">
                    ${
                      showPointsBlock
                        ? `<div class="profile-user-game-score">
                          <div>${this.points}</div>
                        </div>`
                        : ""
                    }
                </div>
                <div class="profile-user-name">${this.name}</div>
            </div>`;
  }

  incrementPoint() {
    this.points++;
    // this.animateIncrement();
  }

  animateIncrement() {
    const $userScoreBox = $(`#${this.uniId}`).find(
      ".profile-user-game-score div"
    );

    $userScoreBox.fadeOut(0);
    $userScoreBox.text("+1").fadeIn();
    setTimeout(() => {
      $userScoreBox.fadeOut(0);
      $userScoreBox.text(this.points).fadeIn();
    }, 1000);
  }
}

class Game {
  constructor(numOfBots) {
    this.numOfBots = numOfBots;
    this.$gameScreenOne = $(".game-modal-screen-one");
    this.$gameScreenWait = $(".game-modal-start-wait");
    this.$gameScreenTwo = $(".game-modal-second-screen");
    this.$gameScreenFinal = $(".game-screen-final");
    this.$gameProgressBlock = $(".game-timeline-block");
    this.$gameProgressBar = $(".game-progress-bar").eq(0);
    // this.$gameResultBlock = $(".game-answer-block");
    this.$gameResultBlock = $(".game-user-profiles");
    this.$answerSubmittedText = $(".game-answer-text");
    this.init();
  }

  initVars() {
    this.gameTime = 10;
    this.currentTime = 0;
    this.gameType = null;
    this.currentQuestion = 0;
    this.isOptionSeleted = false;
    this.MaxNoOfQuestions = 5;
    this.user = null;
    this.bots = [];
    this.currentRuns = 0;
    this.timerId = null;
  }

  init() {
    this.initVars();
    this.showFirstGameScreen();
    this.clearProfiles();
    this.initUsers();
    this.initializeEvents();
    this.gameProgress(this.gameTime);
  }

  clearProfiles() {
    $(".game-user-profile-block").remove();
  }

  initUsers() {
    this.user = new User(getUserName(0), getProfileImg(0));

    for (let i = 0; i < this.numOfBots; i++) {
      const bot = new User(getUserName(i + 1), getProfileImg(i + 1));
      this.bots.push(bot);
    }
  }

  loadUsersScores() {
    this.$gameResultBlock.empty();
    const userResultBlock = [...this.bots, this.user]
      .sort((a, b) => b.points - a.points)
      .map((user) => user.getProfileDOM());
    this.$gameResultBlock.append(userResultBlock);
  }

  initializeEvents() {
    // select elements
    this.$movieGameBtn = $('[game-type="movie"]');
    this.$survivalGameBtn = $('[game-type="survival"]');

    // add event listeners
    this.$movieGameBtn.click(() => {
      this.gameType = "movieGame";
      this.showLoadingGameScreen(this.$movieGameBtn.text());
    });

    this.$survivalGameBtn.click(() => {
      this.gameType = "survivalGame";
      this.showLoadingGameScreen(this.$survivalGameBtn.text());
    });

    $(".restart-game").click(() => {
      this.destroyGame();
      this.init();
    });

    $(".game-option").click((e) => {
      if (!this.isOptionSeleted) {
        this.isOptionSeleted = true;
        $(e.currentTarget).addClass("selected-option");
        $(".game-option").css("cursor", "not-allowed");
        $(".game-option").not($(e.currentTarget)).addClass("not-allowed");
        this.checkAnswerAndUpdateState();
      }
    });
  }

  destroyGame() {
    this.$movieGameBtn.unbind("click");
    this.$survivalGameBtn.unbind("click");
    $(".game-option").unbind("click");
    this.clearSelections();
    if (this.timerId) {
      this.currentRuns = 0;
      clearInterval(this.timerId);
    }
  }

  loadGameData() {
    const gameData = window.quizGameData;
    if (Array.isArray(gameData)) {
      this.gameDataObj = gameData.reduce((acc, cv) => {
        if (cv.isMovieGame === "true") {
          if (acc.movieGame) {
            acc.movieGame.push(cv);
          } else {
            acc.movieGame = [];
            acc.movieGame.push(cv);
          }
        } else {
          if (acc.survivalGame) {
            acc.survivalGame.push(cv);
          } else {
            acc.survivalGame = [];
            acc.survivalGame.push(cv);
          }
        }
        return acc;
      }, {});
    }
  }

  updateGameTitle(titleText) {
    let title = "";
    if (!titleText) {
      if (this.gameType === "movieGame") {
        title = "Which movie are you in?";
      } else {
        title = "Guide to survival";
      }
    } else {
      title = titleText;
    }

    $(".game-modal-title-text").text(title);
  }

  clearSelections() {
    $(".game-option").removeClass(
      "selected-option correct-option wrong-option was-correct-answer not-allowed"
    );
    $(".game-option").css("cursor", "pointer");
  }

  loadQuizScreen(idx = 0) {
    this.clearSelections();
    this.updateDashboardNum();
    this.runBots();
    // remove all profiles
    this.clearProfiles();
    this.isOptionSeleted = false;
    $(".game-progress-bar").css({
      "background-color": `#ffffff`,
      opacity: "10%",
    });

    const questionObj = this.getQuestionData(idx);
    if (questionObj) {
      const {
        optionA,
        optionB,
        optionC,
        optionD,
        movieQuestion,
        survivalQuestion,
        isMovieGame,
      } = questionObj;

      this.currentQuestion = idx;

      if (isMovieGame === "true") {
        $("[quiz-img]").attr("src", movieQuestion).show();
        $("[quiz-img]").removeAttr("srcset");
        $("[quiz-question]").hide();
      } else {
        $("[quiz-img]").hide();
        $("[quiz-question]").text(survivalQuestion).show();
      }
      $('[quiz-option="A"] .game-option-text').text(optionA);
      $('[quiz-option="B"] .game-option-text').text(optionB);
      $('[quiz-option="C"] .game-option-text').text(optionC);
      $('[quiz-option="D"] .game-option-text').text(optionD);
    }
  }

  checkAnswerAndUpdateState() {
    const { answer } = this.getQuestionData(this.currentQuestion);

    if ($(".game-option.selected-option").length) {
      const selectedOption = $(".game-option.selected-option").attr(
        "quiz-option"
      );

      if (selectedOption === answer) {
        $(`[quiz-option=${answer}]`)
          .removeClass("selected-option")
          .addClass("correct-option");

        this.user.incrementPoint();
        this.$gameResultBlock.append(this.user.getProfileDOM());
        this.user.animateIncrement();
      } else {
        $(`[quiz-option=${selectedOption}]`)
          .removeClass("selected-option not-allowed")
          .addClass("wrong-option");

        $(`[quiz-option=${answer}]`)
          .removeClass("not-allowed")
          .addClass("correct-option");
        this.$gameResultBlock.append(this.user.getProfileDOM());
      }
    } else {
      $(`[quiz-option=${answer}]`)
        .removeClass("not-allowed")
        .addClass("was-correct-answer");
      this.$gameResultBlock.append(this.user.getProfileDOM());
    }
  }

  runBots() {
    const { answer } = this.getQuestionData(this.currentQuestion);
    const options = ["A", "B", "C", "D"];
    this.bots.forEach((bot, idx) => {
      const randomNum = getRandomInt(0, 3);
      answer === options[randomNum] && bot.incrementPoint();

      setTimeout(() => {
        this.$gameResultBlock.append(bot.getProfileDOM());
        answer === options[randomNum] && bot.animateIncrement();
      }, 2000 + idx * 3000);
    });
  }

  getQuestionData(idx) {
    return this.gameDataObj[this.gameType][idx];
  }

  showFirstGameScreen() {
    this.$gameScreenOne.css("display", "flex");
    this.$gameScreenWait.hide();
    this.$gameScreenTwo.hide();
    this.$gameScreenFinal.hide();
  }

  showLoadingGameScreen(title) {
    this.$gameScreenWait.css("display", "flex");
    this.$gameScreenTwo.hide();
    this.$gameScreenOne.hide();
    this.$gameScreenFinal.hide();

    let time = 3;
    $(".wait-screen-title").text(title);
    let timer = setInterval(() => {
      if (time >= 0) {
        $(".game-begin-number").text(time);
        time--;
      } else {
        clearInterval(timer);
        this.showSecondGameScreen();
        time = 3;
        $(".game-begin-number").text(time);
      }
    }, 1000);
  }

  showSecondGameScreen() {
    this.startTimer();
    this.loadGameData();
    this.updateGameTitle();
    this.loadQuizScreen();
    this.$answerSubmittedText.show();
    this.$gameScreenTwo.css("display", "flex");
    this.$gameScreenOne.hide();
    this.$gameScreenWait.hide();
    this.$gameScreenFinal.hide();
  }

  showFinalGameScreen() {
    this.loadUsersScores();
    this.$answerSubmittedText.hide();
    this.$gameScreenFinal.css("display", "flex");
    this.$gameScreenOne.hide();
    this.$gameScreenTwo.hide();
  }

  gameProgress(numOfSec) {
    this.$gameProgressBlock.empty();
    for (let i = 0; i < numOfSec; i++) {
      this.$gameProgressBlock.append(this.$gameProgressBar.clone());
    }
  }

  incrementGameProgress(num) {
    const $pBarNum = $(".game-progress-bar").eq(num);
    $pBarNum.css({
      "background-color": `rgba(255, 255, 255, 1)`,
      opacity: `${(num + 2) * 10}%`,
    });
  }

  isOptionSelected() {
    return (
      $(".selected-option").length === 1 || $(".correct-option").length === 1
    );
  }

  updateDashboardNum() {
    $(".game-no-start").text(this.currentQuestion + 1);
    const endNum =
      this.gameDataObj[this.gameType].length <= this.MaxNoOfQuestions
        ? this.gameDataObj[this.gameType].length
        : this.MaxNoOfQuestions;
    $(".game-number-end").text(endNum);
  }

  startTimer() {
    this.currentRuns = 0;
    this.timerId = setInterval(() => {
      if (this.currentRuns < this.gameTime) {
        this.incrementGameProgress(this.currentRuns);
        // if (this.currentRuns === 9 && this.isOptionSelected()) {
        //   this.checkAnswerAndUpdateState();
        // }
        this.currentRuns++;
      } else {
        clearInterval(this.timerId);
        !this.isOptionSelected() && this.checkAnswerAndUpdateState();
        this.currentQuestion++;
        if (
          this.currentQuestion < this.MaxNoOfQuestions &&
          this.currentQuestion < this.gameDataObj[this.gameType].length
        ) {
          setTimeout(() => {
            this.loadQuizScreen(this.currentQuestion);
            this.startTimer();
          }, 2000);
        } else {
          setTimeout(() => {
            this.showFinalGameScreen();
          }, 2000);
        }
      }
    }, 1000);
  }
}

let movieGame;

function openGameModal() {
  $(".game-modal").css("display", "flex").fadeIn();
  movieGame = null;
  movieGame = new Game(3);
}

function closeGameModal() {
  $(".game-modal").fadeOut();
  movieGame && movieGame.destroyGame();
}
