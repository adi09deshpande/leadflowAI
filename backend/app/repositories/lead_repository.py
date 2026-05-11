from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException

from ..core.database import DatabaseConfigurationError, get_db_client
from ..core.settings import get_settings


class LeadRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.leads_table = settings.supabase_leads_table
        self.emails_table = settings.supabase_emails_table
        self.activity_table = settings.supabase_activity_table

    @property
    def client(self):
        return get_db_client()

    def list_leads(
        self,
        *,
        status: Optional[str] = None,
        search: Optional[str] = None,
        source: Optional[str] = None,
        sort_by: str = "score",
    ) -> list[dict[str, Any]]:
        query = self.client.table(self.leads_table).select("*")

        if status and status != "all":
            query = query.eq("status", status)
        if source and source != "all":
            query = query.eq("source", source)
        if search:
            escaped_search = search.replace("%", r"\%").replace(",", " ")
            pattern = f"%{escaped_search}%"
            query = query.or_(
                f"name.ilike.{pattern},email.ilike.{pattern},company.ilike.{pattern},title.ilike.{pattern}"
            )

        sort_column = {
            "score": "score",
            "date": "created_at",
            "name": "name",
        }.get(sort_by, "score")
        descending = sort_by != "name"
        response = query.order(sort_column, desc=descending).execute()
        return self._annotate_leads_with_email_status(response.data or [])

    def get_lead(self, lead_id: str) -> dict[str, Any]:
        response = self.client.table(self.leads_table).select("*").eq("id", lead_id).limit(1).execute()
        data = response.data or []
        if not data:
            raise HTTPException(status_code=404, detail="Lead not found")
        return self._annotate_leads_with_email_status(data)[0]

    def create_lead(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.table(self.leads_table).insert(payload).execute()
        created = (response.data or [None])[0]
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create lead")
        self.log_activity(created["id"], "Created", f"Lead created for {created['name']}")
        return self._annotate_leads_with_email_status([created])[0]

    def update_lead(self, lead_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        self.get_lead(lead_id)
        response = self.client.table(self.leads_table).update(updates).eq("id", lead_id).execute()
        updated = (response.data or [None])[0]
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update lead")
        self.log_activity(lead_id, "Updated", "Lead record updated")
        return self._annotate_leads_with_email_status([updated])[0]

    def delete_lead(self, lead_id: str) -> dict[str, str]:
        lead = self.get_lead(lead_id)
        self.client.table(self.leads_table).delete().eq("id", lead_id).execute()
        self.log_activity(lead_id, "Deleted", f"Deleted lead {lead['name']}")
        return {"deleted": lead_id}

    def import_leads(self, leads: list[dict[str, Any]]) -> dict[str, Any]:
        response = self.client.table(self.leads_table).insert(leads).execute()
        created = response.data or []
        for lead in created:
            self.log_activity(lead["id"], "Imported", f"Imported lead {lead['name']}")
        return {"imported": len(created), "leads": self._annotate_leads_with_email_status(created)}

    def save_generated_email(self, lead_id: str, subject: str, body: str, tone: str) -> dict[str, Any]:
        existing_draft = self.get_latest_email_draft(lead_id)
        if existing_draft:
            response = (
                self.client.table(self.emails_table)
                .update({"subject": subject, "body": body, "tone": tone})
                .eq("id", existing_draft["id"])
                .eq("lead_id", lead_id)
                .eq("sent", False)
                .execute()
            )
            updated = (response.data or [None])[0]
            if updated:
                self.log_activity(lead_id, "Email draft refreshed", subject)
                return updated

        response = self.client.table(self.emails_table).insert(
            {"lead_id": lead_id, "subject": subject, "body": body, "tone": tone, "sent": False}
        ).execute()
        created = (response.data or [None])[0]
        if not created:
            raise HTTPException(status_code=500, detail="Failed to save generated email")
        self.log_activity(lead_id, "Email generated", subject)
        return created

    def get_latest_email_draft(self, lead_id: str) -> Optional[dict[str, Any]]:
        self.get_lead(lead_id)
        response = (
            self.client.table(self.emails_table)
            .select("*")
            .eq("lead_id", lead_id)
            .eq("sent", False)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return (response.data or [None])[0]

    def mark_email_sent(
        self, lead_id: str, *, email_id: Optional[str], subject: str, body: str, tone: str = "professional"
    ) -> dict[str, Any]:
        if email_id:
            response = (
                self.client.table(self.emails_table)
                .update({"sent": True, "sent_at": datetime.utcnow().isoformat()})
                .eq("id", email_id)
                .eq("lead_id", lead_id)
                .execute()
            )
            updated = (response.data or [None])[0]
            if updated:
                self.log_activity(lead_id, "Email sent", updated.get("subject", subject))
                return updated

        response = self.client.table(self.emails_table).insert(
            {
                "lead_id": lead_id,
                "subject": subject,
                "body": body,
                "tone": tone,
                "sent": True,
                "sent_at": datetime.utcnow().isoformat(),
            }
        ).execute()
        created = (response.data or [None])[0]
        if not created:
            raise HTTPException(status_code=500, detail="Failed to mark email as sent")
        self.log_activity(lead_id, "Email sent", created.get("subject", subject))
        return created

    def log_activity(self, lead_id: str, action: str, detail: str) -> None:
        self.client.table(self.activity_table).insert(
            {"lead_id": lead_id, "action": action, "detail": detail}
        ).execute()

    def get_activity(self) -> list[dict[str, Any]]:
        response = (
            self.client.table(self.activity_table)
            .select("id, action, detail, created_at, lead_id")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        items = []
        for row in response.data or []:
            items.append(
                {
                    "action": row.get("action", "Updated"),
                    "target": row.get("detail") or "Lead activity",
                    "time": self._time_ago(row.get("created_at")),
                    "type": self._activity_type(row.get("action", "")),
                }
            )
        return items

    def get_stats(self) -> dict[str, Any]:
        leads = self.list_leads(sort_by="date")
        week_ago = datetime.utcnow() - timedelta(days=7)

        total = len(leads)
        new_this_week = sum(
            1
            for lead in leads
            if lead.get("created_at") and datetime.fromisoformat(lead["created_at"].replace("Z", "+00:00")).replace(tzinfo=None) >= week_ago
        )
        qualified = sum(1 for lead in leads if lead.get("status") in {"qualified", "proposal", "closed_won"})
        enriched = sum(1 for lead in leads if lead.get("enriched"))
        closed_won = sum(1 for lead in leads if lead.get("status") == "closed_won")

        sent_emails = (
            self.client.table(self.emails_table).select("id", count="exact").eq("sent", True).execute()
        )
        emails_sent = sent_emails.count or 0

        return {
            "total_leads": total,
            "new_this_week": new_this_week,
            "qualified": qualified,
            "conversion_rate": round((closed_won / total * 100), 1) if total else 0,
            "emails_sent": emails_sent,
            "enriched": enriched,
            "pipeline_value": qualified * 5000,
        }

    def get_analytics(self) -> dict[str, Any]:
        leads = self.list_leads(sort_by="date")
        emails_response = self.client.table(self.emails_table).select("*").execute()
        emails = emails_response.data or []

        total_leads = len(leads)
        scored_leads = [lead for lead in leads if isinstance(lead.get("score"), (int, float))]
        avg_lead_score = round(sum(lead["score"] for lead in scored_leads) / len(scored_leads), 1) if scored_leads else 0
        qualified_count = sum(1 for lead in leads if lead.get("status") in {"qualified", "proposal", "closed_won"})
        enriched_count = sum(1 for lead in leads if lead.get("enriched"))
        sent_emails = [email for email in emails if email.get("sent")]
        emails_sent = len(sent_emails)
        closed_won = sum(1 for lead in leads if lead.get("status") == "closed_won")

        monthly_map: dict[str, dict[str, Any]] = {}
        now = datetime.utcnow()
        month_keys = []
        for offset in range(7, -1, -1):
            month = now.month - offset
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            key = f"{year:04d}-{month:02d}"
            month_keys.append(key)
            monthly_map[key] = {
                "month": datetime(year, month, 1).strftime("%b"),
                "leads": 0,
                "qualified": 0,
                "emails": 0,
                "converted": 0,
            }

        for lead in leads:
            created_at = self._parse_date(lead.get("created_at"))
            if not created_at:
                continue
            key = created_at.strftime("%Y-%m")
            if key in monthly_map:
                monthly_map[key]["leads"] += 1
                if lead.get("status") in {"qualified", "proposal", "closed_won"}:
                    monthly_map[key]["qualified"] += 1
                if lead.get("status") == "closed_won":
                    monthly_map[key]["converted"] += 1

        for email in sent_emails:
            sent_at = self._parse_date(email.get("sent_at") or email.get("created_at"))
            if not sent_at:
                continue
            key = sent_at.strftime("%Y-%m")
            if key in monthly_map:
                monthly_map[key]["emails"] += 1

        source_counts: dict[str, int] = {}
        for lead in leads:
            source = (lead.get("source") or "Unknown").strip() or "Unknown"
            source_counts[source] = source_counts.get(source, 0) + 1
        source_data = [
            {"name": name, "value": round(count / total_leads * 100, 1) if total_leads else 0, "count": count}
            for name, count in sorted(source_counts.items(), key=lambda item: item[1], reverse=True)
        ]

        funnel_data = [
            {"name": "New Leads", "value": sum(1 for lead in leads if lead.get("status") == "new")},
            {"name": "Contacted", "value": sum(1 for lead in leads if lead.get("status") == "contacted")},
            {"name": "Qualified", "value": sum(1 for lead in leads if lead.get("status") == "qualified")},
            {"name": "Proposal", "value": sum(1 for lead in leads if lead.get("status") == "proposal")},
            {"name": "Closed Won", "value": sum(1 for lead in leads if lead.get("status") == "closed_won")},
        ]

        weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        email_day_counts = {day: 0 for day in weekdays}
        for email in sent_emails:
            sent_at = self._parse_date(email.get("sent_at") or email.get("created_at"))
            if sent_at:
                email_day_counts[sent_at.strftime("%a")] += 1
        emails_by_day = [{"day": day, "count": email_day_counts[day]} for day in weekdays]

        lead_day_counts = {day: 0 for day in weekdays}
        recent_week_cutoff = now - timedelta(days=6)
        for lead in leads:
            created_at = self._parse_date(lead.get("created_at"))
            if created_at and created_at >= recent_week_cutoff:
                lead_day_counts[created_at.strftime("%a")] += 1
        weekly_activity = [{"day": day, "leads": lead_day_counts[day], "emails": email_day_counts[day]} for day in weekdays]

        return {
            "kpis": {
                "avg_lead_score": avg_lead_score,
                "email_send_rate": round(emails_sent / total_leads * 100, 1) if total_leads else 0,
                "enrichment_rate": round(enriched_count / total_leads * 100, 1) if total_leads else 0,
                "estimated_pipeline_value": qualified_count * 5000,
                "conversion_rate": round(closed_won / total_leads * 100, 1) if total_leads else 0,
            },
            "monthly_trend": [monthly_map[key] for key in month_keys],
            "source_data": source_data,
            "funnel_data": funnel_data,
            "emails_by_day": emails_by_day,
            "weekly_activity": weekly_activity,
        }

    @staticmethod
    def _time_ago(date_str: Optional[str]) -> str:
        if not date_str:
            return "just now"
        created_at = datetime.fromisoformat(date_str.replace("Z", "+00:00")).replace(tzinfo=None)
        diff = datetime.utcnow() - created_at
        minutes = int(diff.total_seconds() // 60)
        hours = int(diff.total_seconds() // 3600)
        days = diff.days
        if minutes < 1:
            return "just now"
        if minutes < 60:
            return f"{minutes}m ago"
        if hours < 24:
            return f"{hours}h ago"
        return f"{days}d ago"

    @staticmethod
    def _activity_type(action: str) -> str:
        normalized = action.lower()
        if "email" in normalized:
            return "email"
        if "enrich" in normalized:
            return "enrich"
        if "import" in normalized or "create" in normalized:
            return "import"
        return "update"

    @staticmethod
    def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
        if not date_str:
            return None
        return datetime.fromisoformat(date_str.replace("Z", "+00:00")).replace(tzinfo=None)

    def _annotate_leads_with_email_status(self, leads: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not leads:
            return leads

        lead_ids = [lead["id"] for lead in leads if lead.get("id")]
        if not lead_ids:
            return leads

        response = (
            self.client.table(self.emails_table)
            .select("lead_id, sent_at")
            .in_("lead_id", lead_ids)
            .eq("sent", True)
            .execute()
        )
        sent_map: dict[str, Optional[str]] = {}
        for row in response.data or []:
            lead_id = row.get("lead_id")
            if not lead_id:
                continue
            sent_at = row.get("sent_at")
            current = sent_map.get(lead_id)
            if sent_at and (current is None or sent_at > current):
                sent_map[lead_id] = sent_at
            elif lead_id not in sent_map:
                sent_map[lead_id] = sent_at

        return [
            {
                **lead,
                "has_sent_email": lead.get("id") in sent_map,
                "last_email_sent_at": sent_map.get(lead.get("id")),
            }
            for lead in leads
        ]


def get_repository() -> LeadRepository:
    try:
        return LeadRepository()
    except DatabaseConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
