"""飞书多维表格 (Bitable) API 客户端 — 替代 OpenClaw 的 feishu_bitable_* 工具"""

import os
import json
import time
from typing import Optional, List, Dict, Any

import requests


class FeishuClient:
    """飞书 API 客户端，管理多维表格商品库"""

    FEISHU_API_BASE = "https://open.feishu.cn/open-apis"

    def __init__(self, app_id: Optional[str] = None, app_secret: Optional[str] = None):
        """
        Args:
            app_id: 飞书应用 App ID，默认从环境变量 FEISHU_APP_ID 读取
            app_secret: 飞书应用 App Secret，默认从环境变量 FEISHU_APP_SECRET 读取
        """
        self.app_id = app_id or os.environ.get("FEISHU_APP_ID", "")
        self.app_secret = app_secret or os.environ.get("FEISHU_APP_SECRET", "")
        self._token: Optional[str] = None
        self._token_expires: float = 0

    def _get_tenant_token(self) -> str:
        """获取 tenant_access_token（自动缓存）"""
        if self._token and time.time() < self._token_expires:
            return self._token

        resp = requests.post(
            f"{self.FEISHU_API_BASE}/auth/v3/tenant_access_token/internal",
            json={"app_id": self.app_id, "app_secret": self.app_secret},
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"飞书授权失败: {data.get('msg', '未知错误')}")

        self._token = data["tenant_access_token"]
        self._token_expires = time.time() + data.get("expire", 7200) - 60
        return self._token

    def _headers(self) -> Dict:
        return {"Authorization": f"Bearer {self._get_tenant_token()}"}

    def _request(self, method: str, url: str, json_data: Optional[Dict] = None) -> Dict:
        """通用 API 请求"""
        resp = requests.request(method, url, headers=self._headers(), json=json_data)
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"API失败 [{method} {url}]: {data.get('msg', '未知错误')}")
        return data

    # ---- Bitable 操作 ----

    def list_tables(self, app_token: str) -> List[Dict]:
        """获取多维表格的所有表"""
        data = self._request("GET", f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables")
        return data.get("data", {}).get("items", [])

    def create_table(self, app_token: str, name: str) -> str:
        """创建新表，返回 table_id"""
        data = self._request("POST", f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables",
            {"table": {"name": name, "fields": [{"field_name": "名称", "type": 1}]}})
        return data.get("data", {}).get("table_id", "")

    def create_app(self, name: str = "赛博店长-商品库") -> Dict:
        """创建多维表格"""
        resp = requests.post(
            f"{self.FEISHU_API_BASE}/bitable/v1/apps",
            headers=self._headers(),
            json={"name": name},
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"建表失败: {data.get('msg')}")
        return data["data"]

    def list_fields(self, app_token: str, table_id: str) -> List[Dict]:
        """获取字段列表"""
        resp = requests.get(
            f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables/{table_id}/fields",
            headers=self._headers(),
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"获取字段失败: {data.get('msg')}")
        return data["data"]["items"]

    def get_primary_field_name(self, app_token: str, table_id: str) -> str:
        """获取主字段名"""
        fields = self.list_fields(app_token, table_id)
        for f in fields:
            if f.get("ui_type") == "Text" and f.get("is_primary", False):
                return f["field_name"]
        return fields[0]["field_name"] if fields else "商品名称"

    def list_records(self, app_token: str, table_id: str,
                     page_size: int = 500) -> List[Dict]:
        """获取所有记录"""
        records = []
        page_token = None

        while True:
            params = {"page_size": page_size}
            if page_token:
                params["page_token"] = page_token

            resp = requests.get(
                f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables/{table_id}/records",
                headers=self._headers(),
                params=params,
            )
            data = resp.json()
            if data.get("code") != 0:
                raise RuntimeError(f"读取记录失败: {data.get('msg')}")

            items = data["data"].get("items", [])
            records.extend(items)

            if not data["data"].get("has_more"):
                break
            page_token = data["data"].get("page_token")

        return records

    def create_record(self, app_token: str, table_id: str,
                      fields: Dict[str, Any]) -> str:
        """创建记录，返回 record_id"""
        resp = requests.post(
            f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables/{table_id}/records",
            headers=self._headers(),
            json={"fields": fields},
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"创建记录失败: {data.get('msg')}")
        return data["data"]["record"]["record_id"]

    def update_record(self, app_token: str, table_id: str,
                      record_id: str, fields: Dict[str, Any]) -> bool:
        """更新记录"""
        resp = requests.put(
            f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}",
            headers=self._headers(),
            json={"fields": fields},
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"更新记录失败: {data.get('msg')}")
        return True

    def delete_record(self, app_token: str, table_id: str,
                      record_id: str) -> bool:
        """删除记录"""
        resp = requests.delete(
            f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}",
            headers=self._headers(),
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"删除记录失败: {data.get('msg')}")
        return True

    def create_field(self, app_token: str, table_id: str,
                     field_name: str, field_type: int,
                     property: Optional[Dict] = None) -> Dict:
        """创建字段"""
        body = {"field_name": field_name, "type": field_type}
        if property:
            body["property"] = property

        resp = requests.post(
            f"{self.FEISHU_API_BASE}/bitable/v1/apps/{app_token}/tables/{table_id}/fields",
            headers=self._headers(),
            json=body,
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"创建字段失败: {data.get('msg')}")
        return data["data"]["field"]
