import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const jsPDFInstance = {
  setFontSize: vi.fn(),
  text: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  save: vi.fn(),
};
// A regular function (not an arrow function) so `new jsPDF()` works in the mock.
const jsPDFCtor = vi.fn(function () {
  return jsPDFInstance;
});
vi.mock("jspdf", () => ({ jsPDF: jsPDFCtor }));

import { DownloadReceiptButton, type ReceiptDetails } from "@/components/shared/download-receipt-button";

const receipt: ReceiptDetails = {
  receiptNumber: "RCPT-SCH001-00001",
  studentName: "Rahul Verma",
  feeType: "Tuition Fee",
  amountPaid: 5000,
  remaining: 0,
  paymentDate: "2026-06-22T00:00:00.000Z",
  paymentMode: "CASH",
  status: "PAID",
  schoolName: "Delhi Public School",
  schoolCode: "SCH001",
};

describe("DownloadReceiptButton", () => {
  beforeEach(() => {
    jsPDFCtor.mockClear();
    jsPDFInstance.save.mockClear();
  });

  it("renders a Receipt download button", () => {
    render(<DownloadReceiptButton receipt={receipt} />);
    expect(screen.getByRole("button", { name: /receipt/i })).toBeInTheDocument();
  });

  it("generates and saves a PDF with the receipt number as the filename when clicked", async () => {
    const user = userEvent.setup();
    render(<DownloadReceiptButton receipt={receipt} />);

    await user.click(screen.getByRole("button", { name: /receipt/i }));

    await waitFor(() => expect(jsPDFInstance.save).toHaveBeenCalledOnce());
    expect(jsPDFInstance.save).toHaveBeenCalledWith(`Receipt-${receipt.receiptNumber}.pdf`);
  });

  it("includes the key receipt fields as text in the generated PDF", async () => {
    const user = userEvent.setup();
    render(<DownloadReceiptButton receipt={receipt} />);

    await user.click(screen.getByRole("button", { name: /receipt/i }));

    await waitFor(() => expect(jsPDFInstance.save).toHaveBeenCalledOnce());
    const textCalls = jsPDFInstance.text.mock.calls.map((args) => args[0]);
    expect(textCalls).toContain(receipt.receiptNumber);
    expect(textCalls).toContain(receipt.studentName);
    expect(textCalls.some((t) => typeof t === "string" && t.includes("5,000"))).toBe(true);
  });
});
