const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  houseNumber: { type: String, required: true, trim: true },
  // Public, browser-playable stream URL (HLS .m3u8, MJPEG, or an embeddable page).
  // Raw RTSP credentials are NOT stored here — they stay on the farm's local relay
  // (e.g. go2rtc) which re-publishes a browser-friendly stream over an HTTPS tunnel.
  streamUrl: { type: String, required: true, trim: true },
  streamType: { type: String, enum: ['hls', 'mjpeg', 'iframe'], default: 'hls' },
  location: { type: String, trim: true },
  status: { type: String, enum: ['online', 'offline', 'unknown'], default: 'unknown' },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

cameraSchema.index({ houseNumber: 1, name: 1 });

module.exports = mongoose.model('Camera', cameraSchema);
