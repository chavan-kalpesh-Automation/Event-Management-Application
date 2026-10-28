import os
import secrets
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Callable, List, Optional

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, APIRouter, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_MINUTES = 60 * 12  # 12h for staff convenience
REFRESH_DAYS = 30

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users_col = db.users
sessions_col = db.refresh_sessions
customers_col = db.customers
bookings_col = db.bookings
quotations_col = db.quotations
invoices_col = db.invoices
payments_col = db.payments
inventory_col = db.inventory_items
checklists_col = db.checklists
packages_col = db.packages
expenses_col = db.expenses
followups_col = db.followups


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return pwd.verify(p, h)
    except Exception:
        return False


def make_token(user_id: str, role: str, kind: str, lifetime: timedelta, jti: Optional[str] = None) -> str:
    issued = now_utc()
    payload = {
        "sub": user_id,
        "role": role,
        "type": kind,
        "iat": issued,
        "exp": issued + lifetime,
        "jti": jti or secrets.token_urlsafe(24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode(token: str, expected_type: str) -> dict:
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if p.get("type") != expected_type:
            raise ValueError("wrong token type")
        return p
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})


# ---------------------------- Models ----------------------------
class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class RefreshIn(BaseModel):
    refresh_token: str


class UserPublic(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    role: str
    active: bool = True


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class CreateUserIn(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "worker"


class CustomerIn(BaseModel):
    name: str
    mobile: str
    address: Optional[str] = ""
    email: Optional[str] = ""
    referral_source: Optional[str] = ""
    notes: Optional[str] = ""


class Customer(CustomerIn):
    id: str
    created_at: datetime


class BookingIn(BaseModel):
    customer_id: str
    event_type: str  # Wedding, Haldi, Engagement, Reception, Catering, Blocked, etc.
    venue: str = ""
    start_at: datetime
    end_at: datetime
    status: str = "tentative"  # tentative | confirmed | cancelled | blocked
    guests: int = 0
    package_id: Optional[str] = None
    assigned_worker_ids: List[str] = []
    notes: str = ""
    total_amount: float = 0.0


class Booking(BookingIn):
    id: str
    created_at: datetime
    created_by: str


class QuotationItem(BaseModel):
    name: str
    qty: float = 1
    rate: float = 0
    amount: float = 0


class QuotationIn(BaseModel):
    customer_id: str
    booking_id: Optional[str] = None
    title: str = "Quotation"
    items: List[QuotationItem] = []
    discount: float = 0
    tax_percent: float = 0
    notes: str = ""


class InvoiceIn(QuotationIn):
    pass


class PaymentIn(BaseModel):
    invoice_id: str
    amount: float
    mode: str = "cash"  # cash | upi | bank | other
    note: str = ""


class InventoryItemIn(BaseModel):
    name: str
    category: str = "decoration"  # decoration | food
    unit: str = "pcs"
    stock: float = 0
    reorder_level: float = 0
    cost_per_unit: float = 0


class ChecklistIn(BaseModel):
    booking_id: str
    title: str
    items: List[dict] = []  # [{text, done}]


class PackageIn(BaseModel):
    name: str
    description: str = ""
    price: float = 0
    inclusions: List[str] = []


class ExpenseIn(BaseModel):
    booking_id: Optional[str] = None
    category: str = "misc"
    amount: float
    note: str = ""
    spent_at: datetime = Field(default_factory=now_utc)


class FollowUpIn(BaseModel):
    customer_id: str
    due_at: datetime
    note: str = ""
    done: bool = False


# ------------------- Auth helpers -------------------
async def seed_users():
    owner_u = os.environ["SEED_OWNER_USERNAME"]
    owner_p = os.environ["SEED_OWNER_PASSWORD"]
    worker_u = os.environ.get("SEED_WORKER_USERNAME")
    worker_p = os.environ.get("SEED_WORKER_PASSWORD")
    await users_col.update_one(
        {"username": owner_u},
        {"$setOnInsert": {
            "id": str(uuid.uuid4()),
            "username": owner_u,
            "password_hash": hash_password(owner_p),
            "full_name": "Owner",
            "role": "owner",
            "active": True,
            "created_at": now_utc(),
        }},
        upsert=True,
    )
    if worker_u and worker_p:
        await users_col.update_one(
            {"username": worker_u},
            {"$setOnInsert": {
                "id": str(uuid.uuid4()),
                "username": worker_u,
                "password_hash": hash_password(worker_p),
                "full_name": "Worker",
                "role": "worker",
                "active": True,
                "created_at": now_utc(),
            }},
            upsert=True,
        )
    await users_col.create_index("username", unique=True)
    await sessions_col.create_index("jti", unique=True)
    await sessions_col.create_index("expires_at", expireAfterSeconds=0)
    await customers_col.create_index("mobile")
    await bookings_col.create_index("start_at")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await seed_users()
    yield
    client.close()


app = FastAPI(title="Mauli Events Staff API", lifespan=lifespan)


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")


async def current_user(creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]):
    if not creds:
        raise HTTPException(401, "Missing bearer token")
    p = decode(creds.credentials, "access")
    user = await users_col.find_one({"id": p["sub"], "active": True}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User is inactive or missing")
    return user


def require_roles(*roles: str) -> Callable:
    async def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient role")
        return user
    return dep


async def issue_tokens(user: dict) -> TokenOut:
    jti = secrets.token_urlsafe(32)
    refresh = make_token(user["id"], user["role"], "refresh", timedelta(days=REFRESH_DAYS), jti)
    await sessions_col.insert_one({
        "jti": jti,
        "user_id": user["id"],
        "role": user["role"],
        "expires_at": now_utc() + timedelta(days=REFRESH_DAYS),
        "revoked": False,
    })
    access = make_token(user["id"], user["role"], "access", timedelta(minutes=ACCESS_MINUTES))
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        user=UserPublic(
            id=user["id"],
            username=user["username"],
            full_name=user.get("full_name"),
            role=user["role"],
            active=user.get("active", True),
        ),
    )


# ------------------- Auth routes -------------------
@api_router.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    user = await users_col.find_one({"username": body.username, "active": True})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid username or password")
    return await issue_tokens(user)


@api_router.post("/auth/refresh", response_model=TokenOut)
async def refresh_token(body: RefreshIn):
    p = decode(body.refresh_token, "refresh")
    rec = await sessions_col.find_one_and_update(
        {"jti": p["jti"], "user_id": p["sub"], "revoked": False, "expires_at": {"$gt": now_utc()}},
        {"$set": {"revoked": True}},
    )
    if not rec:
        raise HTTPException(401, "Refresh token revoked or unknown")
    user = await users_col.find_one({"id": p["sub"], "active": True})
    if not user:
        raise HTTPException(401, "User is inactive")
    return await issue_tokens(user)


@api_router.post("/auth/logout", status_code=204)
async def logout(body: RefreshIn):
    try:
        p = decode(body.refresh_token, "refresh")
        await sessions_col.update_one({"jti": p["jti"]}, {"$set": {"revoked": True}})
    except HTTPException:
        pass


@api_router.get("/me", response_model=UserPublic)
async def me(user=Depends(current_user)):
    return UserPublic(
        id=user["id"],
        username=user["username"],
        full_name=user.get("full_name"),
        role=user["role"],
        active=user.get("active", True),
    )


# ---------- Staff management (owner only) ----------
@api_router.get("/users", response_model=List[UserPublic])
async def list_users(_=Depends(require_roles("owner"))):
    docs = await users_col.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return [UserPublic(**d) for d in docs]


@api_router.post("/users", response_model=UserPublic)
async def create_user(body: CreateUserIn, _=Depends(require_roles("owner"))):
    if body.role not in ("owner", "worker"):
        raise HTTPException(400, "Invalid role")
    if await users_col.find_one({"username": body.username}):
        raise HTTPException(400, "Username taken")
    doc = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "password_hash": hash_password(body.password),
        "full_name": body.full_name,
        "role": body.role,
        "active": True,
        "created_at": now_utc(),
    }
    await users_col.insert_one(doc)
    return UserPublic(id=doc["id"], username=doc["username"], full_name=doc["full_name"], role=doc["role"], active=True)


@api_router.patch("/users/{user_id}/toggle")
async def toggle_user(user_id: str, _=Depends(require_roles("owner"))):
    u = await users_col.find_one({"id": user_id})
    if not u:
        raise HTTPException(404)
    await users_col.update_one({"id": user_id}, {"$set": {"active": not u.get("active", True)}})
    return {"ok": True}


# ---------- Customers ----------
@api_router.get("/customers")
async def list_customers(q: Optional[str] = None, user=Depends(current_user)):
    query = {}
    if q:
        query = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"mobile": {"$regex": q}}]}
    docs = await customers_col.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return docs


@api_router.post("/customers")
async def create_customer(body: CustomerIn, user=Depends(current_user)):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    doc["created_by"] = user["id"]
    await customers_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user=Depends(current_user)):
    c = await customers_col.find_one({"id": customer_id}, {"_id": 0})
    if not c:
        raise HTTPException(404)
    bookings = await bookings_col.find({"customer_id": customer_id}, {"_id": 0}).sort("start_at", -1).to_list(100)
    quotes = await quotations_col.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    invoices = await invoices_col.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    return {"customer": c, "bookings": bookings, "quotations": quotes, "invoices": invoices}


@api_router.patch("/customers/{customer_id}")
async def update_customer(customer_id: str, body: CustomerIn, user=Depends(current_user)):
    await customers_col.update_one({"id": customer_id}, {"$set": body.dict()})
    return {"ok": True}


# ---------- Bookings ----------
async def _conflict_check(start_at, end_at, exclude_id: Optional[str] = None):
    q = {
        "status": {"$in": ["confirmed", "blocked"]},
        "start_at": {"$lt": end_at},
        "end_at": {"$gt": start_at},
    }
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    return await bookings_col.find_one(q, {"_id": 0})


@api_router.get("/bookings")
async def list_bookings(start: Optional[str] = None, end: Optional[str] = None, user=Depends(current_user)):
    query = {}
    if start and end:
        query = {"start_at": {"$lt": datetime.fromisoformat(end)}, "end_at": {"$gt": datetime.fromisoformat(start)}}
    docs = await bookings_col.find(query, {"_id": 0}).sort("start_at", 1).to_list(1000)
    for d in docs:
        c = await customers_col.find_one({"id": d.get("customer_id")}, {"_id": 0, "name": 1, "mobile": 1})
        d["customer"] = c
    return docs


@api_router.post("/bookings")
async def create_booking(body: BookingIn, user=Depends(current_user)):
    if body.status == "confirmed":
        clash = await _conflict_check(body.start_at, body.end_at)
        if clash:
            raise HTTPException(409, f"Date conflict with existing booking (status={clash.get('status')})")
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    doc["created_by"] = user["id"]
    await bookings_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user=Depends(current_user)):
    b = await bookings_col.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(404)
    b["customer"] = await customers_col.find_one({"id": b.get("customer_id")}, {"_id": 0})
    return b


@api_router.patch("/bookings/{booking_id}")
async def update_booking(booking_id: str, body: BookingIn, user=Depends(current_user)):
    if body.status == "confirmed":
        clash = await _conflict_check(body.start_at, body.end_at, exclude_id=booking_id)
        if clash:
            raise HTTPException(409, "Date conflict with existing booking")
    await bookings_col.update_one({"id": booking_id}, {"$set": body.dict()})
    return {"ok": True}


@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, _=Depends(require_roles("owner"))):
    await bookings_col.delete_one({"id": booking_id})
    return {"ok": True}


# ---------- Quotations ----------
@api_router.get("/quotations")
async def list_quotations(user=Depends(current_user)):
    return await quotations_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.post("/quotations")
async def create_quotation(body: QuotationIn, user=Depends(current_user)):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    doc["total"] = sum((it["amount"] or (it["qty"] * it["rate"])) for it in doc["items"])
    doc["total"] = doc["total"] * (1 + doc["tax_percent"] / 100) - doc["discount"]
    await quotations_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/quotations/{qid}")
async def get_quotation(qid: str, user=Depends(current_user)):
    q = await quotations_col.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404)
    q["customer"] = await customers_col.find_one({"id": q["customer_id"]}, {"_id": 0})
    return q


# ---------- Invoices ----------
@api_router.get("/invoices")
async def list_invoices(user=Depends(current_user)):
    # Workers see invoices without payment totals
    docs = await invoices_col.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if user["role"] != "owner":
        for d in docs:
            d.pop("total", None)
            d.pop("paid", None)
    return docs


@api_router.post("/invoices")
async def create_invoice(body: InvoiceIn, user=Depends(current_user)):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    doc["total"] = sum((it["amount"] or (it["qty"] * it["rate"])) for it in doc["items"])
    doc["total"] = doc["total"] * (1 + doc["tax_percent"] / 100) - doc["discount"]
    doc["paid"] = 0
    await invoices_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/invoices/{inv_id}")
async def get_invoice(inv_id: str, user=Depends(current_user)):
    inv = await invoices_col.find_one({"id": inv_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404)
    inv["customer"] = await customers_col.find_one({"id": inv["customer_id"]}, {"_id": 0})
    inv["payments"] = await payments_col.find({"invoice_id": inv_id}, {"_id": 0}).to_list(100)
    return inv


# ---------- Payments (owner only for recording) ----------
@api_router.post("/payments")
async def create_payment(body: PaymentIn, _=Depends(require_roles("owner"))):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    await payments_col.insert_one(doc)
    await invoices_col.update_one({"id": body.invoice_id}, {"$inc": {"paid": body.amount}})
    doc.pop("_id", None)
    return doc


# ---------- Inventory ----------
@api_router.get("/inventory")
async def list_inventory(category: Optional[str] = None, user=Depends(current_user)):
    q = {}
    if category:
        q["category"] = category
    return await inventory_col.find(q, {"_id": 0}).sort("name", 1).to_list(500)


@api_router.post("/inventory")
async def create_inventory(body: InventoryItemIn, _=Depends(require_roles("owner"))):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    await inventory_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/inventory/{item_id}")
async def update_inventory(item_id: str, body: InventoryItemIn, _=Depends(require_roles("owner"))):
    await inventory_col.update_one({"id": item_id}, {"$set": body.dict()})
    return {"ok": True}


# ---------- Checklists ----------
@api_router.get("/checklists")
async def list_checklists(booking_id: Optional[str] = None, user=Depends(current_user)):
    q = {"booking_id": booking_id} if booking_id else {}
    return await checklists_col.find(q, {"_id": 0}).to_list(500)


@api_router.post("/checklists")
async def create_checklist(body: ChecklistIn, user=Depends(current_user)):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    await checklists_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/checklists/{cid}")
async def update_checklist(cid: str, body: ChecklistIn, user=Depends(current_user)):
    await checklists_col.update_one({"id": cid}, {"$set": body.dict()})
    return {"ok": True}


# ---------- Packages ----------
@api_router.get("/packages")
async def list_packages(user=Depends(current_user)):
    return await packages_col.find({}, {"_id": 0}).to_list(500)


@api_router.post("/packages")
async def create_package(body: PackageIn, _=Depends(require_roles("owner"))):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    await packages_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Expenses (owner only) ----------
@api_router.get("/expenses")
async def list_expenses(_=Depends(require_roles("owner"))):
    return await expenses_col.find({}, {"_id": 0}).sort("spent_at", -1).to_list(500)


@api_router.post("/expenses")
async def create_expense(body: ExpenseIn, _=Depends(require_roles("owner"))):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    await expenses_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Follow ups ----------
@api_router.get("/followups")
async def list_followups(user=Depends(current_user)):
    return await followups_col.find({}, {"_id": 0}).sort("due_at", 1).to_list(500)


@api_router.post("/followups")
async def create_followup(body: FollowUpIn, user=Depends(current_user)):
    doc = body.dict()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_utc()
    await followups_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.patch("/followups/{fid}")
async def update_followup(fid: str, body: FollowUpIn, user=Depends(current_user)):
    await followups_col.update_one({"id": fid}, {"$set": body.dict()})
    return {"ok": True}


# ---------- Dashboard / Reports ----------
@api_router.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    today = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    month_start = today.replace(day=1)
    today_events = await bookings_col.find({
        "start_at": {"$gte": today, "$lt": tomorrow}
    }, {"_id": 0}).to_list(100)
    for d in today_events:
        d["customer"] = await customers_col.find_one({"id": d.get("customer_id")}, {"_id": 0, "name": 1, "mobile": 1})
    upcoming = await bookings_col.find({
        "start_at": {"$gte": tomorrow},
        "status": {"$in": ["confirmed", "tentative"]},
    }, {"_id": 0}).sort("start_at", 1).limit(5).to_list(5)
    for d in upcoming:
        d["customer"] = await customers_col.find_one({"id": d.get("customer_id")}, {"_id": 0, "name": 1, "mobile": 1})
    enquiries = await bookings_col.count_documents({"status": "tentative"})

    stats = {"today_events": len(today_events), "enquiries": enquiries, "upcoming": len(upcoming)}
    if user["role"] == "owner":
        # Monthly revenue (from invoice.total) & pending (total - paid)
        pipeline = [
            {"$match": {"created_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "revenue": {"$sum": "$total"}, "paid": {"$sum": "$paid"}}},
        ]
        agg = await invoices_col.aggregate(pipeline).to_list(1)
        rev = agg[0]["revenue"] if agg else 0
        paid = agg[0]["paid"] if agg else 0
        stats["revenue_month"] = rev
        stats["pending_amount"] = max(rev - paid, 0)

        exp_pipeline = [
            {"$match": {"spent_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
        eagg = await expenses_col.aggregate(exp_pipeline).to_list(1)
        stats["expenses_month"] = eagg[0]["total"] if eagg else 0
        stats["profit_month"] = rev - stats["expenses_month"]
    return {"stats": stats, "today_events": today_events, "upcoming": upcoming}


@api_router.get("/reports/summary")
async def reports_summary(_=Depends(require_roles("owner"))):
    pipeline = [
        {"$group": {"_id": None, "revenue": {"$sum": "$total"}, "paid": {"$sum": "$paid"}}},
    ]
    agg = await invoices_col.aggregate(pipeline).to_list(1)
    exp = await expenses_col.aggregate([{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    revenue = agg[0]["revenue"] if agg else 0
    paid = agg[0]["paid"] if agg else 0
    expenses = exp[0]["total"] if exp else 0
    return {
        "revenue_total": revenue,
        "paid_total": paid,
        "outstanding": max(revenue - paid, 0),
        "expenses_total": expenses,
        "profit": revenue - expenses,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
