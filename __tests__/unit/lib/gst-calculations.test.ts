import {
  calculateGST,
  calculateTotal,
  extractGST,
  calculateExGST,
  NZ_GST_RATE,
} from '@/lib/gst-calculations';

describe('GST Calculations', () => {
  describe('calculateGST', () => {
    it('should calculate 15% GST correctly', () => {
      expect(calculateGST(100)).toBe(15);
      expect(calculateGST(200)).toBe(30);
      expect(calculateGST(1000)).toBe(150);
    });

    it('should handle decimal amounts', () => {
      expect(calculateGST(99.99)).toBeCloseTo(15.00, 2);
    });

    it('should return 0 for 0 subtotal', () => {
      expect(calculateGST(0)).toBe(0);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total including GST', () => {
      expect(calculateTotal(100)).toBe(115);
      expect(calculateTotal(200)).toBe(230);
    });
  });

  describe('extractGST', () => {
    it('should extract GST from GST-inclusive amount', () => {
      expect(extractGST(115)).toBeCloseTo(15, 2);
      expect(extractGST(230)).toBeCloseTo(30, 2);
    });
  });

  describe('calculateExGST', () => {
    it('should calculate amount excluding GST', () => {
      expect(calculateExGST(115)).toBeCloseTo(100, 2);
      expect(calculateExGST(230)).toBeCloseTo(200, 2);
    });
  });

  describe('NZ_GST_RATE', () => {
    it('should be 15%', () => {
      expect(NZ_GST_RATE).toBe(0.15);
    });
  });
});
