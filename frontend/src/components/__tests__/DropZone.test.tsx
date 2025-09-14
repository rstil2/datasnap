import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropZone } from '../DropZone';

describe('DropZone', () => {
  it('renders basic dropzone', () => {
    render(<DropZone onFileSelect={() => {}} />);
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
    expect(screen.getByText('📁')).toBeInTheDocument();
  });

  it('shows drag active state', () => {
    render(<DropZone onFileSelect={() => {}} />);
    const dropzone = screen.getByText(/drag & drop/i).parentElement;
    if (!dropzone) throw new Error('Dropzone not found');

    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveClass('active');
    expect(screen.getByText(/drop the csv file here/i)).toBeInTheDocument();

    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass('active');
  });

  it('handles file drop', async () => {
    const onFileSelect = vi.fn();
    render(<DropZone onFileSelect={onFileSelect} />);
    const dropzone = screen.getByText(/drag & drop/i).parentElement;
    if (!dropzone) throw new Error('Dropzone not found');

    const file = new File(['test,data\n1,2'], 'test.csv', { type: 'text/csv' });
    const dataTransfer = {
      files: [file],
      types: ['Files'],
      items: [{ kind: 'file', type: 'text/csv', getAsFile: () => file }],
    };

    await act(async () => {
      fireEvent.drop(dropzone, { dataTransfer });
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('shows upload progress', () => {
    render(<DropZone onFileSelect={() => {}} isUploading uploadProgress={50} />);
    expect(screen.queryByText(/drag & drop/i)).not.toBeInTheDocument();
    expect(screen.getByText('50% uploaded')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveStyle({ width: '50%' });
  });
});