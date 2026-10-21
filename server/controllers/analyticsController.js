const Counter = require('../models/Counter');
const Visitor = require('../models/Visitor');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Application = require('../models/Application'); // For revenue, etc. if needed

// --- Client Endpoints ---

exports.initVisitor = async (req, res) => {
  try {
    const { device, browser, os, country } = req.body;
    
    let counter = await Counter.findOne({ name: 'visitorId' });
    if (!counter) {
      counter = new Counter({ name: 'visitorId', value: 0 });
    }
    counter.value += 1;
    await counter.save();

    const vId = `VIS${String(counter.value).padStart(3, '0')}`;
    
    const visitor = new Visitor({
      visitorId: vId,
      device: device || 'Unknown',
      browser: browser || 'Unknown',
      os: os || 'Unknown',
      country: country || 'Unknown',
    });
    
    await visitor.save();
    res.status(200).json({ success: true, visitorId: vId });
  } catch (error) {
    console.error("Error in initVisitor:", error);
    res.status(500).json({ success: false });
  }
};

exports.startSession = async (req, res) => {
  try {
    const { visitorId, sessionId } = req.body;
    if (!visitorId || !sessionId) return res.status(400).json({ success: false });
    
    let visitor = await Visitor.findOne({ visitorId });
    if (!visitor) {
      visitor = new Visitor({ visitorId, sessionCount: 1 });
      await visitor.save();
    } else {
      visitor.lastActiveAt = new Date();
      visitor.sessionCount += 1;
      await visitor.save();
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in startSession:", error);
    res.status(500).json({ success: false });
  }
};

exports.trackEvent = async (req, res) => {
  try {
    const { visitorId, sessionId, eventType, page, country, visaType, userId, applicationId, metadata, draftDetails } = req.body;
    
    if (!visitorId || !sessionId || !eventType) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const event = new AnalyticsEvent({
      visitorId,
      sessionId,
      eventType,
      page,
      country,
      visaType,
      userId,
      applicationId,
      metadata,
    });
    await event.save();

    // Update Visitor details based on event
    let updateFields = { lastActiveAt: new Date(), currentPage: page || '/' };
    if (userId) updateFields.userId = userId;
    if (country) updateFields.country = country;
    
    const actualDraftDetails = draftDetails || metadata?.draftDetails;
    if (actualDraftDetails) {
      if (actualDraftDetails.travelDate) updateFields.draftTravelDate = new Date(actualDraftDetails.travelDate);
      if (actualDraftDetails.returnDate) updateFields.draftReturnDate = new Date(actualDraftDetails.returnDate);
      if (actualDraftDetails.travellerCount !== undefined) updateFields.draftTravellerCount = Number(actualDraftDetails.travellerCount);
      if (actualDraftDetails.nameEntered !== undefined) updateFields.draftNameEntered = actualDraftDetails.nameEntered;
    }
    
    // Status resolution logic
    const statusPriority = {
      'Abandoned': 0,
      'Active': 1,
      'Registered': 2,
      'Application Started': 3,
      'Document Pending': 4,
      'Payment Pending': 5,
      'Payment Completed': 6,
      'Submitted': 7,
      'Under Review': 8,
      'Rejected': 9,
      'Approved': 10
    };

    let newStatus = 'Active';
    if (eventType === 'registration_completed') newStatus = 'Registered';
    else if (eventType === 'start_application') newStatus = 'Application Started';
    else if (eventType === 'document_uploaded') newStatus = 'Payment Pending'; // Or similar
    else if (eventType === 'payment_started') newStatus = 'Payment Pending';
    else if (eventType === 'payment_completed') newStatus = 'Payment Completed';
    else if (eventType === 'application_submitted') newStatus = 'Submitted';
    else if (eventType === 'application_approved') newStatus = 'Approved';
    else if (eventType === 'application_rejected') newStatus = 'Rejected';

    let visitor = await Visitor.findOne({ visitorId });
    if (!visitor) {
      visitor = new Visitor({ visitorId, currentPage: page || '/' });
      await visitor.save();
    }
    
    if (visitor) {
      const currentPriority = statusPriority[visitor.status] || 0;
      const newPriority = statusPriority[newStatus] || 0;
      if (newPriority > currentPriority) {
        updateFields.status = newStatus;
      }
      const updatedVisitor = await Visitor.findOneAndUpdate(
        { visitorId },
        { $set: updateFields },
        { new: true }
      );

      // Sync to Google Sheets instantly on important events to keep draft live
      if (updatedVisitor && (['draft_updated', 'country_selected', 'start_application', 'login_completed', 'registration_completed'].includes(eventType))) {
        try {
          const googleSheetsService = require('../services/googleSheetsService');
          // We look up the User in case they are already registered
          let userObj = {};
          if (updatedVisitor.userId) {
             const User = require('../models/User');
             userObj = await User.findById(updatedVisitor.userId) || {};
          }
          await googleSheetsService.upsertRow(
            { visitor: updatedVisitor, user: userObj, application: {}, transaction: {} },
            process.env.SPREADSHEET_ID || '1llCFju33TnXTFwVQB8D5XDAcUQEeINXKyKgyoUCGh5o'
          );
        } catch(e) {
          console.error("Failed to sync draft to Google Sheets:", e);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in trackEvent:", error);
    res.status(500).json({ success: false });
  }
};

// --- Admin Endpoints ---

const getPeriodFilter = (period) => {
  const now = new Date();
  let gte = new Date();
  switch(period) {
    case 'Today': gte.setHours(0,0,0,0); break;
    case '7 Days': gte.setDate(now.getDate() - 7); break;
    case '30 Days': gte.setDate(now.getDate() - 30); break;
    case '3 Months': gte.setMonth(now.getMonth() - 3); break;
    case '6 Months': gte.setMonth(now.getMonth() - 6); break;
    case '1 Year': gte.setFullYear(now.getFullYear() - 1); break;
    default: gte.setDate(now.getDate() - 30); // Default to 30 Days
  }
  return { $gte: gte };
};

exports.getOverview = async (req, res) => {
  try {
    const { period = '30 Days' } = req.query;
    const dateFilter = { timestamp: getPeriodFilter(period) };
    const visitorDateFilter = { firstVisitAt: getPeriodFilter(period) };

    const totalVisitors = await Visitor.countDocuments(visitorDateFilter);
    const registrations = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'registration_completed' });
    const applicationsStarted = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'start_application' });
    const submitted = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_submitted' });
    const underReview = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_under_review' }); // Or derive from app model
    const approved = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_approved' });
    const rejected = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_rejected' });

    // Assuming we track payments via application model for total revenue or event metadata
    const payments = await Application.find({ 
      createdAt: getPeriodFilter(period),
      paymentStatus: { $in: ['completed', 'paid', 'success'] }
    });
    
    const totalRevenue = payments.reduce((sum, p) => sum + (p.fee || 0), 0);

    // Business Rules Calcs
    const registrationRate = totalVisitors ? ((registrations / totalVisitors) * 100).toFixed(1) : 0;
    const applicationStartRate = totalVisitors ? ((applicationsStarted / totalVisitors) * 100).toFixed(1) : 0;
    
    // Approval Rate = Submitted / Under Review (as per user constraint)
    const approvalRate = underReview ? ((submitted / underReview) * 100).toFixed(1) : (submitted ? 100 : 0); 
    const completionRate = applicationsStarted ? ((submitted / applicationsStarted) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalVisitors,
        totalRegistrations: registrations,
        totalApplications: applicationsStarted,
        totalRevenue,
        pendingApplications: submitted,
        approvedApplications: approved,
        rejectedApplications: rejected,
        conversionRate: completionRate, // Treated completion as conversion here
        registrationRate,
        applicationStartRate,
        approvalRate,
      }
    });
  } catch (error) {
    console.error("Error in overview:", error);
    res.status(500).json({ success: false });
  }
};

exports.getFunnel = async (req, res) => {
  try {
    const { period = '30 Days' } = req.query;
    const dateFilter = { timestamp: getPeriodFilter(period) };
    const visitorDateFilter = { firstVisitAt: getPeriodFilter(period) };

    const visitors = await Visitor.countDocuments(visitorDateFilter);
    const registrations = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'registration_completed' });
    const logins = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'login_completed' });
    const countrySelected = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'country_selected' });
    const visaSelected = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'visa_selected' });
    const startApp = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'start_application' });
    const nameEntered = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'name_entered' });
    const travelerDetails = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'traveler_details_completed' });
    const docUpload = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'document_uploaded' });
    const paymentSummary = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'payment_summary_viewed' });
    const paymentStarted = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'payment_started' });
    const paymentCompleted = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'payment_completed' });
    const submitted = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_submitted' });
    const underReview = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_under_review' });
    const approved = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_approved' });
    const rejected = await AnalyticsEvent.countDocuments({ ...dateFilter, eventType: 'application_rejected' });

    const funnel = [
      { label: 'Visitors', count: visitors },
      { label: 'Registration', count: registrations },
      { label: 'Login', count: logins },
      { label: 'Country Selected', count: countrySelected },
      { label: 'Visa Selected', count: visaSelected },
      { label: 'Start Application', count: startApp },
      { label: 'Name Entered', count: nameEntered },
      { label: 'Traveler Details', count: travelerDetails },
      { label: 'Document Upload', count: docUpload },
      { label: 'Payment Summary', count: paymentSummary },
      { label: 'Payment Started', count: paymentStarted },
      { label: 'Payment Completed', count: paymentCompleted },
      { label: 'Submitted', count: submitted },
      { label: 'Under Review', count: underReview },
      { label: 'Approved', count: approved },
      { label: 'Rejected', count: rejected }
    ];

    res.status(200).json({ success: true, funnel });
  } catch (error) {
    console.error("Error in funnel:", error);
    res.status(500).json({ success: false });
  }
};

exports.getVisitors = async (req, res) => {
  try {
    const { period = '30 Days', country, status, page = 1, limit = 50 } = req.query;
    
    let filter = { firstVisitAt: getPeriodFilter(period) };
    if (country) filter.country = country;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const visitors = await Visitor.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .sort({ lastActiveAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Visitor.countDocuments(filter);

    res.status(200).json({ success: true, visitors, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error in getVisitors:", error);
    res.status(500).json({ success: false });
  }
};

exports.getVisitorDetails = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const visitor = await Visitor.findOne({ visitorId }).populate('userId');
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });

    const events = await AnalyticsEvent.find({ visitorId }).sort({ timestamp: 1 });

    res.status(200).json({ success: true, visitor, events });
  } catch (error) {
    console.error("Error in getVisitorDetails:", error);
    res.status(500).json({ success: false });
  }
};

exports.getUnifiedApplications = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // We want to combine visitors and applications.
    // The easiest way for admin table is to fetch all visitors and applications,
    // and merge them. For large datasets, this might be slow, but it's the requested architectural approach.
    
    // 1. Fetch Applications (populate user)
    let appQuery = {};
    if (status) appQuery.status = status;
    if (search) {
      appQuery.$or = [
        { applicationId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Fetch base applications matching query
    const applications = await Application.find(appQuery)
      .populate('user')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    const totalApps = await Application.countDocuments(appQuery);

    // Fetch corresponding visitors and transactions
    const unifiedData = await Promise.all(applications.map(async (app) => {
      let visitor = {};
      if (app.user) {
        visitor = await Visitor.findOne({ userId: app.user._id }).sort({ lastActiveAt: -1 }).lean() || {};
      }
      const Transaction = require('../models/Transaction');
      const transaction = await Transaction.findOne({ application: app._id }).sort({ createdAt: -1 }).lean() || {};
      
      return {
        visitor,
        application: app,
        user: app.user || {},
        transaction
      };
    }));

    // If no search/status provided, also append visitors without applications
    if (!search && !status && page == 1) {
      const allVisitorIdsWithApps = (await Application.find().select('user').lean())
        .map(a => a.user && a.user.toString()).filter(Boolean);
        
      const visitorsWithoutApps = await Visitor.find({ 
          userId: { $nin: allVisitorIdsWithApps } 
        })
        .populate('userId')
        .sort({ lastActiveAt: -1 })
        .limit(20) // Just show top 20 recent
        .lean();
        
      for (const v of visitorsWithoutApps) {
        unifiedData.push({
          visitor: v,
          application: {},
          user: v.userId || {},
          transaction: {}
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      data: unifiedData,
      total: totalApps,
      page: parseInt(page),
      pages: Math.ceil(totalApps / limit) || 1
    });
  } catch (error) {
    console.error("Error in getUnifiedApplications:", error);
    res.status(500).json({ success: false });
  }
};

