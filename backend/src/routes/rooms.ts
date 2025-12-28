import express, { Request, Response } from 'express';
import Room from '../models/Room';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validateRoom } from '../middleware/validation';

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms with optional filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      type,
      available,
      features,
      page = 1,
      limit = 10,
      sort = 'name'
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (type) filter.type = type;
    if (available !== undefined) filter.status = (available === 'true') ? 'available' : { $ne: 'available' };

    // Handle features filter
    if (features) {
      const featuresList = (features as string).split(',');
      featuresList.forEach(feature => {
        filter[`features.${feature}`] = true;
      });
    }

    // Build sort object
    const sortObj: any = {};
    if (sort === 'name') sortObj.name = 1;
    else sortObj.name = 1; // default

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const rooms = await Room.find(filter)
      .sort(sortObj)
      .limit(limitNum)
      .skip(skip)
      .lean();

    const total = await Room.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: rooms,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalRooms: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error: any) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching rooms'
    });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get single room by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      data: room
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching room'
    });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private (Admin only)
router.post('/', authenticate, authorize('admin'), validateRoom, async (req: Request, res: Response) => {
  try {
    const room = new Room(req.body);
    await room.save();

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating room'
    });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update a room
// @access  Private (Admin only)
router.put('/:id', authenticate, authorize('admin'), validateRoom, async (req: Request, res: Response) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating room'
    });
  }
});

// Lightweight operational update for housekeeping fields
// @route   PATCH /api/rooms/:id/ops
// @desc    Update status, condition, and comment only
// @access  Private (Admin or Maintenance)
router.patch('/:id/ops', authenticate, authorize('admin', 'maintenance'), async (req: Request, res: Response) => {
  try {
    const { status, condition, comment } = req.body as {
      status?: 'not_available' | 'available' | 'booked' | 'occupied';
      condition?: 'pending_cleanup' | 'clean';
      comment?: string;
    };

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (status !== undefined) {
      room.status = status;
    }
    if (condition !== undefined) {
      room.condition = condition;
    }
    if (comment !== undefined) {
      room.comment = String(comment).slice(0, 500);
    }

    await room.save();
    res.status(200).json({ success: true, message: 'Room updated', data: room });
  } catch (error: any) {
    console.error('Ops update error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating room' });
  }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete a room
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting room'
    });
  }
});

// @route   GET /api/rooms/:id/availability
// @desc    Check room availability for specific dates
// @access  Public
router.get('/:id/availability', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check availability based on status only
    if (room.status !== 'available') {
      return res.status(200).json({
        success: true,
        available: false,
        reason: 'Room status is not available'
      });
    }

    // Here you would check against reservations
    // For now, we'll assume it's available if the room is marked as available
    res.status(200).json({
      success: true,
      available: true,
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        // price and capacity removed
      }
    });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking availability'
    });
  }
});

export default router;
