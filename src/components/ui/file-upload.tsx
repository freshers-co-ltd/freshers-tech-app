'use client';

import { Trash2 } from 'lucide-react';
import {
	createContext,
	type Dispatch,
	forwardRef,
	type SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	type DropzoneOptions,
	type DropzoneState,
	type FileRejection,
	useDropzone,
} from 'react-dropzone';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { toast } from '@/components/Toast';
import { mediaService } from '@/lib/mediaService';
import { cn } from '@/lib/utils';
import { Button } from './button';

type DirectionOptions = 'rtl' | 'ltr' | undefined;

type FileUploaderContextType = {
	dropzoneState: DropzoneState;
	isLOF: boolean;
	isFileTooBig: boolean;
	removeFileFromSet: (index: number) => void;
	activeIndex: number;
	setActiveIndex: Dispatch<SetStateAction<number>>;
	orientation: 'horizontal' | 'vertical';
	direction: DirectionOptions;
	existingImages?: string[];
	onRemoveExisting?: (path: string) => void;
	bucket?: string;
	maxFiles?: number;
	value: File[] | null;
};

const FileUploaderContext = createContext<FileUploaderContextType | null>(null);

export const useFileUpload = () => {
	const context = useContext(FileUploaderContext);
	if (!context) {
		throw new Error('useFileUpload must be used within a FileUploaderProvider');
	}
	return context;
};

type FileUploaderProps = {
	value: File[] | null;
	reSelect?: boolean;
	onValueChange: (value: File[] | null) => void;
	dropzoneOptions: DropzoneOptions;
	orientation?: 'horizontal' | 'vertical';
	existingImages?: string[];
	onRemoveExisting?: (path: string) => void;
	bucket?: string;
};

export const FileUploader = forwardRef<
	HTMLDivElement,
	FileUploaderProps & React.HTMLAttributes<HTMLDivElement>
>(
	(
		{
			className,
			dropzoneOptions,
			value,
			onValueChange,
			reSelect,
			orientation = 'horizontal',
			existingImages,
			onRemoveExisting,
			bucket,
			children,
			dir,
			...props
		},
		ref,
	) => {
		const [isFileTooBig, setIsFileTooBig] = useState(false);
		const [isLOF, setIsLOF] = useState(false);
		const [activeIndex, setActiveIndex] = useState(-1);

		const {
			accept = {
				'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
				'video/*': ['.mp4', '.MOV', '.AVI'],
			},
			maxFiles = 1,
			maxSize = 4 * 1024 * 1024,
			multiple = true,
		} = dropzoneOptions;

		const reSelectAll = maxFiles === 1 ? true : reSelect;
		const direction: DirectionOptions = dir === 'rtl' ? 'rtl' : 'ltr';

		const removeFileFromSet = useCallback(
			(i: number) => {
				if (!value) {
					return;
				}
				const newFiles = value.filter((_, index) => index !== i);
				onValueChange(newFiles);
			},
			[value, onValueChange],
		);

		const onDrop = useCallback(
			(acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
				if (!acceptedFiles) {
					toast.error('Error uploading file.');
					return;
				}

				const newValues: File[] = value ? [...value] : [];

				if (reSelectAll) {
					newValues.splice(0, newValues.length);
				}

				acceptedFiles.forEach((file) => {
					if (newValues.length < maxFiles) {
						newValues.push(file);
					} else {
						toast.error('Maximum file limit reached.');
					}
				});

				onValueChange(newValues);

				if (rejectedFiles.length > 0) {
					for (const rejection of rejectedFiles) {
						const firstError = rejection.errors[0];
						if (!firstError) {
							continue;
						}

						if (firstError.code === 'file-too-large') {
							toast.error(`File is too large. Max size is ${maxSize / 1024 / 1024}MB`);
							break;
						}
						if (firstError.message) {
							toast.error(firstError.message);
							break;
						}
					}
				}
			},
			[reSelectAll, value, onValueChange, maxFiles, maxSize],
		);

		const opts = dropzoneOptions ? dropzoneOptions : { accept, maxFiles, maxSize, multiple };

		const dropzoneState = useDropzone({
			...opts,
			onDrop,
			onDropRejected: () => setIsFileTooBig(true),
			onDropAccepted: () => setIsFileTooBig(false),
		});

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.stopPropagation();

				if (!value) {
					return;
				}

				const moveNext = () => {
					const nextIndex = activeIndex + 1;
					setActiveIndex(nextIndex > value.length - 1 ? 0 : nextIndex);
				};

				const movePrev = () => {
					const nextIndex = activeIndex - 1;
					setActiveIndex(nextIndex < 0 ? value.length - 1 : nextIndex);
				};

				const prevKey =
					orientation === 'horizontal'
						? direction === 'ltr'
							? 'ArrowLeft'
							: 'ArrowRight'
						: 'ArrowUp';

				const nextKey =
					orientation === 'horizontal'
						? direction === 'ltr'
							? 'ArrowRight'
							: 'ArrowLeft'
						: 'ArrowDown';

				if (e.key === nextKey) {
					moveNext();
				} else if (e.key === prevKey) {
					movePrev();
				} else if (e.key === 'Enter' || e.key === 'Space') {
					if (activeIndex === -1) {
						dropzoneState.inputRef.current?.click();
					}
				} else if (e.key === 'Delete' || e.key === 'Backspace') {
					if (activeIndex !== -1) {
						removeFileFromSet(activeIndex);
						if (value.length - 1 === 0) {
							setActiveIndex(-1);
							return;
						}
						movePrev();
					}
				} else if (e.key === 'Escape') {
					setActiveIndex(-1);
				}
			},
			[value, activeIndex, removeFileFromSet, orientation, direction, dropzoneState.inputRef],
		);

		useEffect(() => {
			if (!value) {
				setIsLOF(false);
				return;
			}
			setIsLOF(value.length === maxFiles);
		}, [value, maxFiles]);

		return (
			<FileUploaderContext.Provider
				value={{
					dropzoneState,
					isLOF,
					isFileTooBig,
					removeFileFromSet,
					activeIndex,
					setActiveIndex,
					orientation,
					direction,
					existingImages,
					onRemoveExisting,
					bucket,
					maxFiles,
					value,
				}}>
				<div
					ref={ref}
					onKeyDownCapture={handleKeyDown}
					className={cn('grid w-full focus:outline-hidden overflow-hidden ', className, {
						'gap-2': value && value.length > 0,
					})}
					dir={dir}
					{...props}>
					{children}
				</div>
			</FileUploaderContext.Provider>
		);
	},
);

FileUploader.displayName = 'FileUploader';

export const FileUploaderContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ children, className, ...props }, ref) => {
		const { orientation, existingImages, onRemoveExisting, bucket, maxFiles, value } =
			useFileUpload();

		const hasNewFiles = value && value.length > 0;
		const isSingleImage = maxFiles === 1;

		const firstExistingImage = existingImages?.[0];

		return (
			<div className={cn('w-full px-1')} aria-description="content file holder">
				<div
					{...props}
					ref={ref}
					className={cn(
						' rounded-xl gap-1',
						orientation === 'horizontal' ? 'grid grid-cols-2' : 'flex flex-col',
						className,
					)}>
					{firstExistingImage && !hasNewFiles && (
						<div
							key={firstExistingImage}
							className="relative p-0 overflow-hidden border rounded-md size-20">
							<ImageWithFallback
								src={mediaService.getMediaUrl(firstExistingImage, bucket || 'property-media')}
								alt="Current"
								className="object-cover size-20"
							/>
							{isSingleImage ? (
								<div className="absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-medium text-white rounded-md bg-primary">
									CURRENT
								</div>
							) : (
								onRemoveExisting && (
									<Button
										type="button"
										variant="destructive"
										size="xs"
										className="absolute size-5 top-[0.145em] right-1"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											onRemoveExisting(firstExistingImage);
										}}>
										<Trash2 />
									</Button>
								)
							)}
						</div>
					)}
					{children}
				</div>
			</div>
		);
	},
);

FileUploaderContent.displayName = 'FileUploaderContent';

export const FileUploaderItem = forwardRef<
	HTMLDivElement,
	{ index: number } & React.HTMLAttributes<HTMLDivElement>
>(({ className, index, children, ...props }, ref) => {
	const { removeFileFromSet, activeIndex, direction } = useFileUpload();
	const isSelected = index === activeIndex;
	return (
		<div
			ref={ref}
			className={cn(
				'h-7 p-1 border rounded-md justify-between overflow-hidden  w-full cursor-pointer relative hover:bg-primary-foreground',
				className,
				isSelected ? 'bg-muted' : '',
			)}
			{...props}>
			<div className="font-medium  leading-none tracking-tight flex items-center gap-1.5 h-full w-full">
				{children}
			</div>
			<Button
				type="button"
				variant="destructive"
				size="xs"
				className={cn(
					'absolute size-5',
					direction === 'rtl' ? 'top-1 left-1' : 'top-[0.145em] right-1',
				)}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					removeFileFromSet(index);
				}}>
				<span className="sr-only">remove item {index}</span>
				<Trash2 />
			</Button>
		</div>
	);
});

FileUploaderItem.displayName = 'FileUploaderItem';

interface FileInputProps extends React.HTMLAttributes<HTMLDivElement> {
	parentclass?: string;
	dropmsg?: string;
}
export const FileInput = forwardRef<HTMLDivElement, FileInputProps>(
	({ className, parentclass, dropmsg, children, ...props }, ref) => {
		const { dropzoneState, isFileTooBig, isLOF } = useFileUpload();
		const rootProps = isLOF ? {} : dropzoneState.getRootProps();

		return (
			<div
				ref={ref}
				{...props}
				className={cn(
					'relative w-full',
					parentclass,
					isLOF ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
				)}>
				<div
					className={cn(
						'w-full rounded-lg transition-colors duration-300 ease-in-out',
						dropzoneState.isDragAccept && 'border-green-500 bg-green-50',
						dropzoneState.isDragReject && 'border-red-500 bg-red-50',
						isFileTooBig && 'border-red-500 bg-red-200',
						!dropzoneState.isDragActive && 'border-neutral-300 hover:border-neutral-400',
						className,
					)}
					{...rootProps}>
					{children}
					{dropzoneState.isDragActive && (
						<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary-foreground/60 backdrop-blur-xs">
							<p className="font-medium text-primary">Drop an image here.</p>
						</div>
					)}
				</div>
				<input
					ref={dropzoneState.inputRef}
					disabled={isLOF}
					{...dropzoneState.getInputProps()}
					className={cn(isLOF && 'cursor-not-allowed')}
				/>
			</div>
		);
	},
);

FileInput.displayName = 'FileInput';
