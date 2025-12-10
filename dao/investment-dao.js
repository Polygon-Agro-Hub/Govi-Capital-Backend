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
        COALESCE((SELECT SUM(i.shares) FROM investment i WHERE i.reqId = ir.id AND i.invtStatus = 'Approved'), 0 ) AS existShare
      FROM investmentrequest ir
      INNER JOIN cropvariety cv ON ir.varietyId = cv.id
      INNER JOIN cropgroup cg ON cv.cropGroupId = cg.id
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
