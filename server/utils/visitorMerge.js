const Visitor = require('../models/Visitor');
const Application = require('../models/Application');
const googleSheetsService = require('../services/googleSheetsService');

/**
 * Handles merging of visitor records upon user login/signup.
 * If the user already has an existing primary visitorId, we update their records
 * to use the primary one instead, and return the primary visitorId so the client can sync.
 * @param {string} currentVisitorId - The visitorId sent by the client.
 * @param {object} user - The user document.
 * @returns {string} - The visitorId that should be used by the client.
 */
const mergeVisitorOnLogin = async (currentVisitorId, user) => {
  console.log(`[mergeVisitorOnLogin] called with visitorId: ${currentVisitorId}, userId: ${user?._id}`);
  if (!user || !user._id) return currentVisitorId;

  try {
    let resolvedVisitorId = currentVisitorId;
    
    // Find if the user already has an existing visitor record (the oldest/original one)
    const existingVisitor = await Visitor.findOne({ userId: user._id }).sort({ createdAt: 1 });

    if (existingVisitor && currentVisitorId && existingVisitor.visitorId !== currentVisitorId) {
      // User has an old visitor ID, and they logged in with a new one.
      // We merge by returning the OLD one, so the client swaps to it.
      resolvedVisitorId = existingVisitor.visitorId;
      console.log(`[VisitorMerge] User ${user._id} logged in with new visitor ${currentVisitorId}. Reverting to original visitor ${resolvedVisitorId}.`);
      
      const currentVisitorDoc = await Visitor.findOne({ visitorId: currentVisitorId });
      if (currentVisitorDoc) {
        // Copy draft/recent tracking details from the new session into the old session
        if (currentVisitorDoc.country && currentVisitorDoc.country !== 'Unknown') existingVisitor.country = currentVisitorDoc.country;
        if (currentVisitorDoc.draftTravelDate) existingVisitor.draftTravelDate = currentVisitorDoc.draftTravelDate;
        if (currentVisitorDoc.draftReturnDate) existingVisitor.draftReturnDate = currentVisitorDoc.draftReturnDate;
        if (currentVisitorDoc.draftTravellerCount) existingVisitor.draftTravellerCount = currentVisitorDoc.draftTravellerCount;
        if (currentVisitorDoc.draftNameEntered) existingVisitor.draftNameEntered = currentVisitorDoc.draftNameEntered;
        if (currentVisitorDoc.currentPage) existingVisitor.currentPage = currentVisitorDoc.currentPage;
        existingVisitor.lastActiveAt = new Date();
        
        await existingVisitor.save();
        
        // Delete the new temporary visitor to keep DB clean
        await Visitor.deleteOne({ visitorId: currentVisitorId });
        
        // Instead of deleting the orphaned row from Google Sheets, rename it to the original visitorId
        await googleSheetsService.renameVisitorIdInSheet(
          currentVisitorId,
          resolvedVisitorId,
          process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o'
        );
      }
    } else if (currentVisitorId) {
      // No older visitor found, or it's the same one. Just link it.
      const currentVisitorDoc = await Visitor.findOne({ visitorId: currentVisitorId });
      if (currentVisitorDoc && String(currentVisitorDoc.userId) !== String(user._id)) {
        currentVisitorDoc.userId = user._id;
        await currentVisitorDoc.save();
      }
      resolvedVisitorId = currentVisitorId;
    } else if (existingVisitor) {
       // Client sent no visitorId, use existing
       resolvedVisitorId = existingVisitor.visitorId;
    }

    if (resolvedVisitorId) {
       // Google Sheets sync for the resolved visitor
       const v = await Visitor.findOne({ visitorId: resolvedVisitorId });
       if (v) {
         console.log(`[VisitorMerge] Syncing to Google Sheets for visitor ${resolvedVisitorId}`);
         await googleSheetsService.upsertRow(
           { visitor: v, user: user, application: {}, transaction: {} },
           process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o'
         ).then(() => console.log(`[VisitorMerge] Sync successful for ${resolvedVisitorId}`))
          .catch(e => console.error("[VisitorMerge] Google Sheets Sync Error:", e));
       }
    }

    return resolvedVisitorId;
  } catch (error) {
    console.error("Failed to merge visitor:", error);
    return currentVisitorId;
  }
};

module.exports = { mergeVisitorOnLogin };
