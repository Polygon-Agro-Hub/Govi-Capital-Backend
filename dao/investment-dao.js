const {
  admin,
  plantcare,
  collectionofficer,
  marketPlace,
  dash,
} = require("../startup/database");

exports.getInvestmentRequestVarietiesFull = async () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        cg.cropNameEnglish,
        cg.image AS cropGroupImage,
        ir.farmerId,
        CONCAT(u.firstName, ' ', u.lastName) AS farmerName,
        air.id AS approvedId,
        COALESCE(air.totValue, 0) AS totalValue,
        COALESCE(air.defineShares, 0) AS defineShares,
        COALESCE((SELECT SUM(i.shares) FROM investment i WHERE i.reqId = ir.id AND i.invtStatus = 'Approved'), 0) AS existShare
      FROM investmentrequest ir
      INNER JOIN cropgroup cg ON ir.cropId = cg.id
      INNER JOIN users u ON ir.farmerId = u.id
      LEFT JOIN approvedinvestmentrequest air ON ir.id = air.reqId
      WHERE ir.reqStatus = 'Approved'
      AND ir.publishStatus = 'Published'
      ORDER BY air.createdAt DESC;

    `;
    plantcare.query(sql, [], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

exports.getOngoingCultivationsForUser = async (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        cg.id,
        cg.cropNameEnglish
      FROM ongoingcultivations oc
      LEFT JOIN ongoingcultivationscrops occ ON oc.id = occ.ongoingCultivationId
      LEFT JOIN cropgroup cg ON occ.cropId = cg.id
      WHERE oc.userId = ?
      GROUP BY 
          cg.id,
          cg.cropNameEnglish;
    `;
    plantcare.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

exports.getInvestmentRequestInfoByRequestId = async (requestId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        u.id AS farmerId,
        u.district AS farmerDistrict,
        CONCAT(u.firstName, ' ', u.lastName) AS farmerName,
        ir.extentha,
        ir.extentac,
        ir.extentp,
        ir.expectedYield,
        ir.startDate,
        air.totValue,
        cv.varietyNameEnglish,
        cg.cropNameEnglish,
        air.defineShares,
        air.minShare,
        air.maxShare,
        (air.totValue / air.defineShares) AS oneShare,
        (SELECT SUM(i.shares) FROM investment i WHERE i.reqId = ir.id AND i.invtStatus = 'Approved') AS fillShares
      FROM investmentrequest ir
      INNER JOIN users u ON ir.farmerId = u.id
      LEFT JOIN approvedinvestmentrequest air ON ir.id = air.reqId
      INNER JOIN cropgroup cg ON ir.cropId = cg.id
      INNER JOIN cropvariety cv ON cv.cropGroupId = cg.id
      WHERE ir.id = ?;
    `;

    plantcare.query(sql, [requestId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows && rows.length > 0 ? rows[0] : null);
    });
  });
};

exports.generateInvestmentRefCode = async () => {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePart = `${yy}${mm}${dd}`;
    const prefix = `IR${datePart}`;

    const sql = `
      SELECT refCode
      FROM investment
      WHERE refCode LIKE CONCAT(?, '%')
      ORDER BY refCode DESC
      LIMIT 1
    `;

    plantcare.query(sql, [prefix], (err, rows) => {
      if (err) return reject(err);
      let nextSeq = 1;
      if (rows && rows.length > 0 && rows[0].refCode) {
        const last = rows[0].refCode;
        const seqStr = last.slice(prefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum)) nextSeq = seqNum + 1;
      }
      const refCode = `${prefix}${String(nextSeq).padStart(5, "0")}`;
      resolve(refCode);
    });
  });
};

exports.createInvestment = async (payload) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO investment 
        (investerId, reqId, refCode, investerName, nic, nicFront, nicBack, shares, totInvt, expextreturnInvt, internalRate, bankSlip, invtStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'To Review')
    `;

    const params = [
      payload.investerId,
      payload.reqId,
      payload.refCode,
      payload.investerName,
      payload.nic,
      payload.nicFront || null,
      payload.nicBack || null,
      payload.shares,
      payload.totInvt,
      payload.expextreturnInvt,
      payload.internalRate,
      payload.bankSlip || null,
    ];

    plantcare.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve({ id: result.insertId, refCode: payload.refCode });
    });
  });
};
