/*
 * Copyright 2025 coze-dev Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
import { type FC, useState, useRef, useEffect } from 'react';

import classnames from 'classnames';
import { getFileInfo } from '@coze-common/chat-core';
import { I18n } from '@coze-arch/i18n';
import { type FileItem } from '@coze-arch/bot-semi/Upload';
import {
  IconButton,
  Toast,
  Typography,
  UIButton,
  UIInput,
  Upload,
  useFieldApi,
  withField,
} from '@coze-arch/bot-semi';
import {
  IconAdd,
  IconClose,
  IconCloseNoCycle,
  IconCopyLink,
} from '@coze-arch/bot-icons';
import { type shortcut_command } from '@coze-arch/bot-api/playground_api';

import {
  type DSLFormFieldCommonProps,
  type DSLComponent,
  type TValue,
  type TCustomUpload,
} from '../types';
import { LabelWithDescription } from '../label-with-desc';
import { getFileInfoByFileType } from '../../../../utils/file-const';

import style from './index.module.less';

const UploadContent: FC<{
  file: FileItem;
  disabled?: boolean;
  inputType: shortcut_command.InputType;
  onRemove: () => void;
  onRetry: () => void;
}> = ({ file, disabled, inputType, onRemove, onRetry }) => {
  const isFailed = file.status === 'uploadFail';
  const isUploading = file.status === 'uploading';
  const fileType =
    file.fileInstance && getFileInfo(file.fileInstance)?.fileType;
  const fileIcon = fileType && getFileInfoByFileType(fileType)?.icon;

  return (
    <div
      className={classnames(
        style.file,
        'flex border border-solid rounded-lg items-center w-full coz-stroke-primary',
        {
          [style['file-uploading'] || '']: isUploading,
        },
      )}
      style={{
        // @ts-expect-error ts 无法识别自定义变量
        '--var-percent': `${file.percent}%`,
      }}
    >
      <img
        src={fileIcon ?? file.url}
        className={classnames(
          'w-6 h-6',
          fileType === 'image' &&
            'rounded border border-solid coz-stroke-primary',
        )}
      />
      <Typography.Text ellipsis className="mx-2 flex-1 text-sm">
        {file.name}
      </Typography.Text>
      {isFailed ? (
        <div
          onClick={e => {
            e.stopPropagation();
            if (!disabled) {
              onRetry();
            }
          }}
          className={style.retry}
        >
          <IconClose className="coz-fg-hglt-red" />
          <div>{I18n.t('Retry')}</div>
        </div>
      ) : null}
      <IconButton
        className={classnames('close-btn w-5 h-5', style['delete-btn'])}
        disabled={disabled}
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        theme="borderless"
        size="small"
        icon={<IconCloseNoCycle className={style['delete-icon']} />}
      />
    </div>
  );
};

interface UploadProps {
  value?: unknown;
  name: string;
  onChange?: (value: TValue) => void;
  uploadFile?: TCustomUpload;
  maxSize?: number;
  accept?: string;
  disabled?: boolean;
  validateStatus?: 'error' | 'success';
  inputType: shortcut_command.InputType;
}

const FileUpload: FC<
  UploadProps & {
    toggle: () => void;
  }
> = ({
  value,
  name,
  uploadFile,
  onChange,
  inputType,
  disabled,
  toggle,
  ...props
}) => {
  const [file, setFile] = useState<FileItem | undefined>();
  const fieldApi = useFieldApi(name);
  const uidRef = useRef<string | undefined>(file?.uid);
  const onUpload = (newFile: FileItem) => {
    if (newFile.fileInstance) {
      setFile({
        ...newFile,
        percent: 0,
        status: 'uploading',
      });
      // 立即清理错误状态
      fieldApi.setError(true);
      uidRef.current = newFile?.uid;
      uploadFile?.({
        file: newFile.fileInstance,
        onProgress: percent => {
          if (uidRef.current !== newFile.uid) {
            return;
          }
          setFile({
            ...newFile,
            percent,
            status: 'uploading',
          });
        },
        onSuccess: (url, width = 0, height = 0) => {
          if (uidRef.current !== newFile.uid) {
            return;
          }
          onChange?.({
            fileInstance: newFile.fileInstance,
            url,
            width,
            height,
          });
          setFile({
            ...newFile,
            response: url,
            percent: 100,
            status: 'success',
          });
        },
        onError: () => {
          if (uidRef.current !== newFile.uid) {
            return;
          }
          // 上传失败，触发错误状态
          fieldApi.setError(false);
          setFile({
            ...newFile,
            status: 'uploadFail',
          });
        },
      });
    }
  };

  return (
    <>
      <Upload
        action=""
        className="w-full"
        draggable
        limit={1}
        {...props}
        disabled={disabled}
        onAcceptInvalid={() => {
          Toast.error(I18n.t('shortcut_Illegal_file_format'));
        }}
        onSizeError={() => {
          if (props.maxSize) {
            Toast.error(
              I18n.t('file_too_large', {
                max_size: `${props.maxSize / 1024}MB`,
              }),
            );
          }
        }}
        customRequest={({ onSuccess }) => {
          // 即使 action="" ，在不传 customRequest 仍然会触发一次向当前 URL 上传文件的请求
          // 这里传一个 mock customRequest 来阻止 semi 默认的上传行为
          onSuccess('');
        }}
        showUploadList={false}
        onChange={({ currentFile }) => {
          // semi 同一个文件会触发多次 onChange，这里只响应首个
          if (
            uidRef.current !== currentFile.uid &&
            (!props.maxSize ||
              (currentFile.fileInstance?.size &&
                currentFile.fileInstance.size <= props.maxSize * 1024))
          ) {
            onUpload(currentFile);
          }
        }}
      >
        {file ? (
          <UploadContent
            file={file}
            inputType={inputType}
            onRemove={() => {
              uidRef.current = undefined;
              setFile(undefined);
              onChange?.('');
              setTimeout(() => {
                // 删除文件，清理错误状态避免立刻飘红
                fieldApi.setError(true);
              });
            }}
            onRetry={() => {
              if (file) {
                onUpload(file);
              }
            }}
          />
        ) : (
          <UIButton
            icon={<IconAdd />}
            disabled={disabled}
            className={classnames(style['upload-button'], 'w-full')}
          >
            <span className={style['upload-button-text-short']}>
              {I18n.t('shortcut_component_upload_component_placeholder')}
            </span>
          </UIButton>
        )}
      </Upload>
      {!file && (
        <IconButton
          disabled={disabled}
          icon={<IconCopyLink />}
          onClick={toggle}
        />
      )}
    </>
  );
};

const FileInput: FC<
  UploadProps & {
    toggle: () => void;
  }
> = ({ disabled, onChange, toggle }) => (
  <>
    <UIInput disabled={disabled} onChange={onChange} className={style.input} />
    <IconButton
      disabled={disabled}
      icon={<IconCloseNoCycle />}
      onClick={toggle}
    />
  </>
);

// 为了方便控制向外传递的 value
const UploadInner = withField((props: UploadProps) => {
  const [showInput, setShowInput] = useState(false);
  const hasError = props.validateStatus === 'error';
  const fieldApi = useFieldApi(props.name);

  // 避免清空输入导致的飘红
  useEffect(() => {
    setTimeout(() => {
      props.onChange?.('');
      // 避免 onchange 触发校验导致立刻飘红
      setTimeout(() => {
        fieldApi.setError(true);
      });
    });
  }, [showInput]);

  return (
    <div
      className={classnames(
        'flex items-center justify-start gap-2',
        style.container,
        hasError && style['container-error'],
      )}
    >
      {showInput ? (
        <FileInput
          toggle={() => {
            setShowInput(false);
          }}
          {...props}
        />
      ) : (
        <FileUpload
          toggle={() => {
            setShowInput(true);
          }}
          {...props}
        />
      )}
    </div>
  );
});

export const DSLFormUpload: DSLComponent<
  DSLFormFieldCommonProps & {
    maxSize?: number;
    accept?: string;
    inputType: shortcut_command.InputType;
  }
> = ({
  context: { uploadFile, readonly },
  props: { name, description, rules, ...props },
}) => (
  <div>
    <LabelWithDescription name={name} description={description} />
    <UploadInner
      field={name}
      noLabel
      name={name}
      fieldStyle={{ padding: 0 }}
      uploadFile={uploadFile}
      disabled={readonly}
      rules={readonly ? undefined : rules}
      {...props}
    />
  </div>
);
