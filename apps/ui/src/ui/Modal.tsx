import { Dialog, Transition } from '@headlessui/react'
import { Fragment, PropsWithChildren, ReactNode } from 'react'
import Button from './Button'
import { CloseIcon } from './icons'
import './Modal.css'

export interface ModalStateProps {
    open: boolean
    onClose: (open: boolean) => void
}

export interface ModalProps extends ModalStateProps {
    title: ReactNode
    description?: ReactNode
    actions?: ReactNode
    size?: 'small' | 'regular' | 'large' | 'fullscreen'
}

export default function Modal({
    children,
    description,
    open,
    onClose,
    title,
    actions,
    size,
}: PropsWithChildren<ModalProps>) {
    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className={`modal ${size ?? 'small'}`} onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="transition-enter"
                    enterFrom="transition-enter-from"
                    enterTo="transition-enter-to"
                    leave="transition-leave"
                    leaveFrom="transition-leave-from"
                    leaveTo="transition-leave-to"
                >
                    <div className="modal-overlay" />
                </Transition.Child>
                <div className="modal-wrapper">
                    <Transition.Child
                        as={Fragment}
                        enter="transition-enter"
                        enterFrom="transition-enter-from transition-enter-from-scale"
                        enterTo="transition-enter-to"
                        leave="transition-leave"
                        leaveFrom="transition-leave-from"
                        leaveTo="transition-leave-to"
                    >
                        <Dialog.Panel className="modal-inner">
                            <div className="modal-header">
                                {
                                    size === 'fullscreen' && (
                                        <Button
                                            variant="secondary"
                                            onClick={() => onClose(false)}
                                            icon={<CloseIcon />}
                                        >
                                            {'Exit'}
                                        </Button>
                                    )
                                }
                                <Dialog.Title as="h3">{title}</Dialog.Title>
                                {
                                    size === 'fullscreen' && actions && (
                                        <div className="modal-fullscreen-actions">
                                            {actions}
                                        </div>
                                    )
                                }
                            </div>
                            {
                                description && (
                                    <Dialog.Description className="modal-description">
                                        {description}
                                    </Dialog.Description>
                                )
                            }
                            <div className="modal-content">
                                {children}
                            </div>
                            {
                                !!(actions && size !== 'fullscreen') && (
                                    <div className="modal-footer">
                                        {actions}
                                    </div>
                                )
                            }
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    )
}