const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 用户登录：创建或更新用户记录，返回 users._id 作为 userId
const login = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  try {
    // 根据 _openid 查找用户
    const userRes = await db.collection('users').where({ _openid: openid }).limit(1).get();
    if (userRes.data && userRes.data.length > 0) {
      // 已有用户，更新登录时间
      const existingUser = userRes.data[0];
      await db.collection('users').doc(existingUser._id).update({
        data: { loginTime: db.serverDate() }
      });
      return { userId: existingUser._id, isNewUser: false };
    } else {
      // 新用户，创建记录
      const addRes = await db.collection('users').add({
        data: {
          _openid: openid,
          username: '',
          avatarUrl: '',
          loginTime: db.serverDate()
        }
      });
      return { userId: addRes._id, isNewUser: true };
    }
  } catch (err) {
    return { userId: null, isNewUser: false, error: err.message || err };
  }
};

// ========== lean_logs 相关接口 ==========

// 获取用户所有有记录的日期
const getRecordDates = async (event) => {
  const { userId } = event;
  if (!userId) return { data: [] };
  const res = await db.collection('lean_logs')
    .where({ userId })
    .field({ date: true })
    .get();
  return res;
};

// 根据日期获取记录
const getRecordByDate = async (event) => {
  const { userId, date } = event;
  if (!userId || !date) return { data: [] };
  return await db.collection('lean_logs')
    .where({ userId, date })
    .limit(1)
    .get();
};

// 新增记录
const addLog = async (event) => {
  const { record, userId, date } = event;
  const { _openid, ...rest } = record;
  const res = await db.collection('lean_logs').add({
    data: { ...rest, userId, date }
  });
  return res;
};

// 更新记录
const updateLog = async (event) => {
  const { recordId, record } = event;
  const updateData = {};
  Object.keys(record).forEach((key) => {
    if (key !== '_id' && key !== '_openid' && record[key] !== undefined && record[key] !== null) {
      updateData[key] = record[key];
    }
  });
  return await db.collection('lean_logs').doc(recordId).update({ data: updateData });
};

// 获取记录列表（统计页用）
const getLogList = async (event) => {
  const { userId, startDate } = event;
  if (!userId) return { data: [] };
  let query = db.collection('lean_logs').where({ userId });
  if (startDate) {
    query = db.collection('lean_logs').where({
      userId,
      date: db.command.gte(startDate)
    });
  }
  return await query.orderBy('date', 'desc').limit(100).get();
};

// 获取最近的上一条记录（一键填写用）
const getPreviousRecord = async (event) => {
  const { userId, date } = event;
  if (!userId || !date) return { data: [] };
  const _ = db.command;
  return await db.collection('lean_logs')
    .where({ userId, date: _.lt(date) })
    .orderBy('date', 'desc')
    .limit(1)
    .get();
};

// 删除记录
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 云函数入口函数
exports.main = async (event) => {
  switch (event.type) {
    case "login":
      return await login(event);
    // lean_logs 接口
    case "getRecordDates":
      return await getRecordDates(event);
    case "getRecordByDate":
      return await getRecordByDate(event);
    case "addLog":
      return await addLog(event);
    case "updateLog":
      return await updateLog(event);
    case "getLogList":
      return await getLogList(event);
    case "getPreviousRecord":
      return await getPreviousRecord(event);
  }
};
