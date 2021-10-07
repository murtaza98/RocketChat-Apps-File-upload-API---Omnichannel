import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat';
import { IUploadDescriptor } from '@rocket.chat/apps-engine/definition/uploads/IUploadDescriptor';
import { Buffer } from 'buffer';

export class UploadApiEndpoint extends ApiEndpoint {
    public path: string = 'upload';

    public async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {
        try {
            const { rid, username, fileBase64, fileName } = request.content;

            const room = await read.getRoomReader().getById(rid) as (ILivechatRoom | undefined);
            if (!room) {
                throw new Error('Room not found');
            }

            const fileBuffer = Buffer.from(fileBase64, 'base64');

            const fileDescriptorForVisitor: IUploadDescriptor = {
                room,
                filename: fileName,
                visitorToken: room.visitor.token,
            };
            console.log(fileDescriptorForVisitor);
            const fileUploadedByVisitor = await modify.getCreator().getUploadCreator().uploadBuffer(fileBuffer, fileDescriptorForVisitor);

            const user = await read.getUserReader().getByUsername(username);
            if (!user) {
                throw new Error('User not found');
            }
            const fileDescriptorForUser: IUploadDescriptor = {
                room,
                filename: fileName,
                user,
            };
            console.log(fileDescriptorForUser);
            const fileUploadedByUser = await modify.getCreator().getUploadCreator().uploadBuffer(fileBuffer, fileDescriptorForUser);

            return this.json({
                status: HttpStatusCode.OK,
                content: {
                    message: '',
                    content: {
                        fileUrlByVisitor: fileUploadedByVisitor.url,
                        fileUrlByUser: fileUploadedByUser.url,
                    },
                    success: true,
                },
            });
        } catch (error) {
            console.log(error);
            this.app.getLogger().error(error);
            return this.json({
                status: HttpStatusCode.INTERNAL_SERVER_ERROR,
                content: {
                    message: 'Failed to upload image',
                    error: error.message,
                    success: false,
                },
            });
        }
    }
}
