/** 
 *  syncPromise
 *  处理Promise  同步请求的时候，发生错误，
 *  需要进行串联执行的操作
*/
class syncPromise {
  uesFuncList = [];
  STATUS = "succeed";
  ERR = null;
  RejectFuncList = [];
  ResolveFuncList = [];
  mainFunc = Promise.resolve;
  constructor(func) {
    this._setMainFunc(func);
    this._init();
  }

  /* 初始化方法 */
  _init() {
    let STATUS = this.STATUS;
    if (STATUS == "waiting") {
      return this._waitingFunc;
    } else if (STATUS == "succeed") {
      return this._resFunc;
    } else {
      return this._errFunc();
    }
  }

  /* 等待情况下的处理 */
  _waitingFunc(data) {
    // 当前是等待状态，后续进入的请求都需求等待第一个请求完成以后才能继续执行
    return new Promise((resolve, reject) => {
      // 利用promise  实现请求等待
      apiFuncList.push([resolve, reject]);
    })
      .then((res) => {
        // console.log("res-failure",res)
        // return Promise.reject(res)
        return uni.$apiFunc[propKey](data);
      })
      .then((res) => {
        if (!this.ResolveFuncList.length) {
          return Promise.resolve(res);
        } else {
          /* 利用js 是单线程的特点处理  */
          this._nextFunc();
          return Promise.resolve(res);
        }
      })
      .catch((err) => {
        this.STATUS = "failure";
        //  TODO  管道链接处理函数
        this._nextFunc();
        return Promise.reject(err);
      });
  }

  _nextFunc() {
    let FuncList = [];
    let _this = this;
    if (this.STATU == "failure") {
      FuncList = this.RejectFuncList;
    } else {
      FuncList = this.ResolveFuncList;
    }
    const generator = (function* () {
      for (let index = 0; index < FuncList.length; index++) {
        let it = FuncList[i];
        const newRes = yield it(res, _this._next());
        res = newRes ? newRes : res;
      }
    })();
    generator.next();
  }

  /* 是否继续执行 */
  _next(generator) {
    return () => {
      Promise.resolve().then(() => generator.next());
    };
  }

  /* 成功状态的执行 */
  _resFunc() {
    const _this = this;
    STATUS = "waiting"; // 进入等待状态
    return Promise.resolve()
      .then(() => {
        //   执行 用户设置的promise 主方法
        return _this.mainFunc();
      })
      .then((res) => {
        STATUS = "succeed";
        ERR = null;
        _this._executeFunc(0, undefined); // 执行栈中的等待函数
        return res;
      })
      .catch((err) => {
        return _this._errFunc(err);
      });
  }

  /* 设置主方法 */
  _setMainFunc(func = Promise.resolve) {
    this.mainFunc = func;
  }

  /* 执行栈中的等待函数 */
  _executeFunc(state = 0, data = undefined) {
    uesFuncList.slice(0).forEach(() => {
      uesFuncList.shift()[state](data); // 基于链表思想，最先入栈的先进行执行，并出栈
    });
  }

  /* 错误方法的执行 */
  _errFunc(err) {
    STATUS = "failure";
    uesFuncList.slice(0).forEach(() => {
      uesFuncList.shift()[1](err); // 基于链表思想，最先入栈的先进行执行，并出栈
    });
    ERR = err || "第一个请求出现错误";
    return err;
  }

  /* 注册失败的回调函数 */
  _useReject(use = () => {}) {
    this.RejectFuncList.push(use);
  }

  /* 注册成功的回调函数 */
  _useResolve(use = () => {}) {
    this.ResolveFuncList.push(use);
  }
}

export default syncPromise;
