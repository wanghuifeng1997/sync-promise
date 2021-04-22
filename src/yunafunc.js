let apiFuncList = [];
let STATUS = "succeed";
let ERR = null;
/** 这是个需要处理权限的请求，
 * 为了防止权限的请求并发带来的不可预测性BUG
 * 特意建立此请求权，
 * 采用 Proxy 代理的方式实现
 * */
export const limitsApi = new Proxy(
  {},
  {
    get(target, propKey, receiver) {
      //  处理上一个请求是或否返回，如果没有返回将此请求堆入栈中
      if (STATUS == "waiting") {
        // 当前是等待状态，后续进入的请求都需求等待第一个请求完成以后才能继续执行
        return (data) =>
          new Promise((resolve, reject) => {
            // 利用promise  实现请求等待
            apiFuncList.push([resolve, reject]);
          })
            .then((res) => {
              // console.log("res-failure",res)
              // return Promise.reject(res)
              return uni.$apiFunc[propKey](data);
            })
            .catch((err) => {
              STATUS = "failure";
              return Promise.reject(err);
            });
      } else if (STATUS == "succeed") {
        STATUS = "waiting"; // 进入等待状态
        return (data = {}) => {
          return uni.$apiFunc[propKey](data)
            .then((res) => {
              STATUS = "succeed";
              ERR = null;
              apiFuncList.slice(0).forEach((item) => {
                apiFuncList.shift()[0](); // 基于链表思想，最先入栈的先进行执行，并出栈
              });
              return res;
            })
            .catch((err) => {
              STATUS = "failure";
              apiFuncList.slice(0).forEach((item) => {
                apiFuncList.shift()[1](err); // 基于链表思想，最先入栈的先进行执行，并出栈
              });
              ERR = err || "第一个请求出现错误";
              return err;
            });
        };
      } else {
        //  当前处理第一个请求时错误情况
        // TODO 请求是否还继续
        return () =>
          new Promise((resolve, reject) => {
            return reject(ERR);
          });
      }
    },
  }
);