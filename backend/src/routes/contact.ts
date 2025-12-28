import express, { Request, Response } from 'express';
import Contact from '../models/Contact';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateContact } from '../middleware/validation';
import { getSortObject } from '../utils/helpers';

const router = express.Router();

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', validateContact, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message, category } = req.body;

    // Get client IP and user agent for tracking
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const contact = new Contact({
      name,
      email,
      phone,
      subject,
      message,
      category: category || 'general',
      ipAddress,
      userAgent
    });

    await contact.save();

    // TODO: Send email notification to admin
    // You can implement email functionality here using nodemailer

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt
      }
    });
  } catch (error: any) {
    console.error('Submit contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting contact form'
    });
  }
});

// @route   GET /api/contact
// @desc    Get all contact submissions (admin only)
// @access  Private (Admin/Staff)
router.get('/', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const contacts = await Contact.find(filter)
      .populate('respondedBy', 'firstName lastName email')
      .sort(getSortObject(sort))
      .limit(limitNum)
      .skip(skip);

    const total = await Contact.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get status counts for dashboard
    const statusCounts = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalContacts: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      statistics: {
        statusCounts
      }
    });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contacts'
    });
  }
});

// @route   GET /api/contact/:id
// @desc    Get single contact submission
// @access  Private (Admin/Staff)
router.get('/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('respondedBy', 'firstName lastName email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    // Mark as read if it's new
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching contact'
    });
  }
});

// @route   PUT /api/contact/:id/respond
// @desc    Respond to contact submission
// @access  Private (Admin/Staff)
router.put('/:id/respond', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res: Response) => {
  try {
    const { response } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response is required'
      });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    contact.response = response;
    contact.respondedBy = req.user!.id;
    contact.responseDate = new Date();
    contact.status = 'replied';

    await contact.save();
    await contact.populate('respondedBy', 'firstName lastName email');

    // TODO: Send email response to the person who submitted the contact form
    // You can implement email functionality here using nodemailer

    res.status(200).json({
      success: true,
      message: 'Response sent successfully',
      data: contact
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    console.error('Respond to contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while responding to contact'
    });
  }
});

// @route   PUT /api/contact/:id/status
// @desc    Update contact submission status
// @access  Private (Admin/Staff)
router.put('/:id/status', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, priority } = req.body;

    const validStatuses = ['new', 'read', 'replied', 'resolved'];
    const validPriorities = ['low', 'medium', 'high'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority'
      });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    if (status) contact.status = status;
    if (priority) contact.priority = priority;

    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    console.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating contact'
    });
  }
});

// @route   DELETE /api/contact/:id
// @desc    Delete contact submission
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact submission deleted successfully'
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact ID'
      });
    }

    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting contact'
    });
  }
});

export default router;
