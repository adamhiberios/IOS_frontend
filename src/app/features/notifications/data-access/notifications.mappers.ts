import { type NotificationItemDto } from './notifications.dto';
import { type Notification } from './notification.model';

/** Map a wire `NotificationItemDto` to the frontend {@link Notification}. */
export function toNotification(dto: NotificationItemDto): Notification {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    body: dto.body,
    data: dto.data ?? {},
    read: dto.read,
    createdAt: dto.createdAt,
  };
}
